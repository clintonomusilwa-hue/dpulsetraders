import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { api_base, ApiHelpers, ServerTime } from '@/external/bot-skeleton';
import { CONNECTION_STATUS } from '@/external/bot-skeleton/services/api/observables/connection-status-stream';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import './bulk-trader.scss';

type SymbolOption = {
    value: string;
    label: string;
    market?: string;
    exchangeIsOpen?: boolean;
};

type TradeTypeOption = {
    value: string;
    label: string;
};

type DurationOption = {
    value: string;
    label: string;
    min: number;
    max: number;
};

type BulkTraderForm = {
    symbol: string;
    tradeType: string;
    contractType: string;
    durationUnit: string;
    duration: string;
    stake: string;
    numberOfTrades: string;
};

type Status = {
    kind: 'error' | 'success';
    message: string;
} | null;

const INITIAL_FORM: BulkTraderForm = {
    symbol: '',
    tradeType: '',
    contractType: '',
    durationUnit: '',
    duration: '',
    stake: '1',
    numberOfTrades: '1',
};

const toSymbolOption = (item: any): SymbolOption | null => {
    const value = item?.symbol || item?.underlying_symbol || item?.code;
    if (!value) return null;

    return {
        value,
        label: item.display_name || item.name || value,
        market: item.market,
        exchangeIsOpen: item.exchange_is_open,
    };
};

const BulkTraderContent = observer(({ store }: { store: NonNullable<ReturnType<typeof useStore>> }) => {
    const navigate = useNavigate();
    const { app, client, common } = store;
    const { isAuthorized, isAuthorizing, connectionStatus } = useApiBase();
    const [symbols, setSymbols] = useState<SymbolOption[]>([]);
    const [tradeTypes, setTradeTypes] = useState<TradeTypeOption[]>([]);
    const [contractTypes, setContractTypes] = useState<TradeTypeOption[]>([]);
    const [durations, setDurations] = useState<DurationOption[]>([]);
    const [form, setForm] = useState<BulkTraderForm>(INITIAL_FORM);
    const [step, setStep] = useState<'configure' | 'review'>('configure');
    const [isLoading, setIsLoading] = useState(true);
    const [isOptionsLoading, setIsOptionsLoading] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState<Status>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const selectedSymbol = useMemo(() => symbols.find(item => item.value === form.symbol), [form.symbol, symbols]);
    const selectedTradeType = useMemo(
        () => tradeTypes.find(item => item.value === form.tradeType),
        [form.tradeType, tradeTypes]
    );
    const selectedContractType = useMemo(
        () => contractTypes.find(item => item.value === form.contractType),
        [contractTypes, form.contractType]
    );
    const selectedDuration = useMemo(
        () => durations.find(item => item.value === form.durationUnit),
        [durations, form.durationUnit]
    );
    const currency = client?.currency || 'USD';
    const isLoggedIn = isAuthorized || client?.is_logged_in;

    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            try {
                setIsLoading(true);
                await Promise.race([
                    api_base.init(),
                    new Promise<never>((_, reject) =>
                        window.setTimeout(() => reject(new Error('Deriv connection timed out')), 8000)
                    ),
                ]);

                ServerTime.init(common);
                app.setDBotEngineStores();
                if (!ApiHelpers.instance) {
                    ApiHelpers.setInstance(app.api_helpers_store);
                }

                const activeSymbols = await Promise.race([
                    api_base.active_symbols.length > 0
                        ? Promise.resolve(api_base.active_symbols)
                        : api_base.getActiveSymbols(),
                    new Promise<never>((_, reject) =>
                        window.setTimeout(
                            () => reject(new Error('Market data request timed out')),
                            12000
                        )
                    ),
                ]);
                const options = activeSymbols.map(toSymbolOption).filter(Boolean) as SymbolOption[];

                if (isMounted) {
                    setSymbols(options);
                    setForm(current => ({ ...current, symbol: current.symbol || options[0]?.value || '' }));
                    setError(options.length ? '' : localize('No active markets are available right now.'));
                }
            } catch (initializationError) {
                console.error('Bulk Trader initialization failed:', initializationError);
                if (isMounted) {
                    setError(localize('We could not load trading markets. Check your connection and try again.'));
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        initialize();
        return () => {
            isMounted = false;
        };
    }, [app, common]);

    useEffect(() => {
        let isMounted = true;
        const loadTradeTypes = async () => {
            if (!form.symbol || !ApiHelpers.instance?.contracts_for) return;
            setIsOptionsLoading(true);
            setStatus(null);
            try {
                const options = await ApiHelpers.instance.contracts_for.getTradeTypesForQuickStrategy(form.symbol);
                if (isMounted) {
                    const nextTradeTypes = (options || []).map((item: any) => ({
                        value: item.value,
                        label: item.text || item.name || item.value,
                    }));
                    setTradeTypes(nextTradeTypes);
                    setForm(current => ({
                        ...current,
                        tradeType: nextTradeTypes.some(item => item.value === current.tradeType)
                            ? current.tradeType
                            : nextTradeTypes[0]?.value || '',
                    }));
                }
            } catch (loadError) {
                console.error('Bulk Trader trade types failed:', loadError);
                if (isMounted) setStatus({ kind: 'error', message: localize('Trade types could not be loaded.') });
            } finally {
                if (isMounted) setIsOptionsLoading(false);
            }
        };

        loadTradeTypes();
        return () => {
            isMounted = false;
        };
    }, [form.symbol]);

    useEffect(() => {
        let isMounted = true;
        const loadContractOptions = async () => {
            if (!form.symbol || !form.tradeType || !ApiHelpers.instance?.contracts_for) return;
            setIsOptionsLoading(true);
            try {
                const [contractOptions, durationOptions] = await Promise.all([
                    ApiHelpers.instance.contracts_for.getContractTypes(form.tradeType),
                    ApiHelpers.instance.contracts_for.getDurations(form.symbol, form.tradeType),
                ]);

                if (isMounted) {
                    const nextContracts = (contractOptions || []).map((item: any) => ({
                        value: item.value,
                        label: item.text || item.value,
                    }));
                    const nextDurations = (durationOptions || []).map((item: any) => ({
                        value: item.unit,
                        label: item.display || item.unit,
                        min: Number(item.min),
                        max: Number(item.max),
                    }));
                    setContractTypes(nextContracts);
                    setDurations(nextDurations);
                    setForm(current => ({
                        ...current,
                        contractType: nextContracts.some(item => item.value === current.contractType)
                            ? current.contractType
                            : nextContracts[0]?.value || '',
                        durationUnit: nextDurations.some(item => item.value === current.durationUnit)
                            ? current.durationUnit
                            : nextDurations[0]?.value || '',
                        duration: nextDurations.some(item => item.value === current.durationUnit)
                            ? current.duration
                            : String(nextDurations[0]?.min || ''),
                    }));
                }
            } catch (loadError) {
                console.error('Bulk Trader contract options failed:', loadError);
                if (isMounted) setStatus({ kind: 'error', message: localize('Contract options could not be loaded.') });
            } finally {
                if (isMounted) setIsOptionsLoading(false);
            }
        };

        loadContractOptions();
        return () => {
            isMounted = false;
        };
    }, [form.symbol, form.tradeType]);

    const updateField = (field: keyof BulkTraderForm, value: string) => {
        setStatus(null);
        setFieldErrors(current => ({ ...current, [field]: '' }));
        setForm(current => ({ ...current, [field]: value }));
    };

    const validate = () => {
        const nextErrors: Record<string, string> = {};
        const stake = Number(form.stake);
        const numberOfTrades = Number(form.numberOfTrades);
        const duration = Number(form.duration);

        if (!form.symbol) nextErrors.symbol = localize('Select a market.');
        if (!form.tradeType) nextErrors.tradeType = localize('Select a trade type.');
        if (!form.contractType) nextErrors.contractType = localize('Select a contract type.');
        if (!form.durationUnit || !Number.isFinite(duration)) nextErrors.duration = localize('Enter a valid duration.');
        if (selectedDuration && (duration < selectedDuration.min || duration > selectedDuration.max)) {
            nextErrors.duration = localize('Duration must be between {{min}} and {{max}}.', {
                min: selectedDuration.min,
                max: selectedDuration.max,
            });
        }
        if (!Number.isFinite(stake) || stake <= 0) nextErrors.stake = localize('Stake must be greater than zero.');
        if (!Number.isInteger(numberOfTrades) || numberOfTrades < 1 || numberOfTrades > 50) {
            nextErrors.numberOfTrades = localize('Choose between 1 and 50 trades.');
        }

        setFieldErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const reviewTrades = (event: React.FormEvent) => {
        event.preventDefault();
        setStatus(null);
        if (validate()) setStep('review');
    };

    const simulateTrades = async () => {
        setIsSimulating(true);
        setStatus(null);
        try {
            await new Promise(resolve => window.setTimeout(resolve, 500));
            setStatus({
                kind: 'success',
                message: localize(
                    'Simulation complete. No trades were sent to Deriv and no account balance was changed.'
                ),
            });
        } catch {
            setStatus({ kind: 'error', message: localize('The simulation could not be completed. Please try again.') });
        } finally {
            setIsSimulating(false);
        }
    };

    const renderSelect = (
        label: string,
        field: keyof BulkTraderForm,
        options: Array<{ value: string; label: string }>,
        disabled = false
    ) => (
        <label className='bulk-trader__field'>
            <span>{label}</span>
            <select
                value={form[field]}
                onChange={event => updateField(field, event.target.value)}
                disabled={disabled}
                data-testid={`bulk-trader-${field}`}
            >
                <option value=''>{localize('Select')}</option>
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {fieldErrors[field] && <small className='bulk-trader__field-error'>{fieldErrors[field]}</small>}
        </label>
    );

    if (isLoading) {
        return (
            <main className='bulk-trader'>
                <div className='bulk-trader__state'>{localize('Loading markets and contract options…')}</div>
            </main>
        );
    }

    return (
        <main className='bulk-trader'>
            <section className='bulk-trader__hero'>
                <div>
                    <p className='bulk-trader__eyebrow'>{localize('Trading workspace')}</p>
                    <h1>{localize('Bulk Trader')}</h1>
                    <p>{localize('Prepare multiple identical contract proposals in one controlled workflow.')}</p>
                </div>
                <div className='bulk-trader__mode-pill'>
                    <span className='bulk-trader__mode-dot' />
                    {localize('Simulation mode')}
                </div>
            </section>

            {!isLoggedIn && (
                <div className='bulk-trader__notice bulk-trader__notice--info' role='status'>
                    <strong>{localize('Log in before trading')}</strong>
                    <span>
                        {localize(
                            'You can prepare and review a batch here, but an authenticated Deriv account is required before any real trade could ever be considered.'
                        )}
                    </span>
                </div>
            )}

            {connectionStatus !== CONNECTION_STATUS.OPENED && (
                <div className='bulk-trader__notice bulk-trader__notice--warning' role='status'>
                    {isAuthorizing
                        ? localize('Connecting to Deriv…')
                        : localize('Market data connection is not ready. Some options may be unavailable.')}
                </div>
            )}

            {error && (
                <div className='bulk-trader__notice bulk-trader__notice--error' role='alert'>
                    {error}
                </div>
            )}

            <div className='bulk-trader__layout'>
                <section className='bulk-trader__card'>
                    <div className='bulk-trader__card-heading'>
                        <div>
                            <p className='bulk-trader__step-label'>
                                {step === 'configure' ? localize('Step 1 of 2') : localize('Step 2 of 2')}
                            </p>
                            <h2>{step === 'configure' ? localize('Configure your batch') : localize('Review trades')}</h2>
                        </div>
                        <span className='bulk-trader__safe-label'>{localize('No live orders')}</span>
                    </div>

                    {step === 'configure' ? (
                        <form onSubmit={reviewTrades} noValidate>
                            <div className='bulk-trader__form-grid'>
                                {renderSelect(localize('Market / symbol'), 'symbol', symbols)}
                                {renderSelect(localize('Trade type'), 'tradeType', tradeTypes, !form.symbol || isOptionsLoading)}
                                {renderSelect(
                                    localize('Contract type'),
                                    'contractType',
                                    contractTypes,
                                    !form.tradeType || isOptionsLoading
                                )}
                                {renderSelect(
                                    localize('Duration unit'),
                                    'durationUnit',
                                    durations,
                                    !form.tradeType || isOptionsLoading
                                )}
                                <label className='bulk-trader__field'>
                                    <span>{localize('Duration')}</span>
                                    <input
                                        type='number'
                                        min={selectedDuration?.min || 1}
                                        max={selectedDuration?.max || 365}
                                        step='1'
                                        value={form.duration}
                                        onChange={event => updateField('duration', event.target.value)}
                                        disabled={!form.durationUnit}
                                        data-testid='bulk-trader-duration'
                                    />
                                    {fieldErrors.duration && (
                                        <small className='bulk-trader__field-error'>{fieldErrors.duration}</small>
                                    )}
                                </label>
                                <label className='bulk-trader__field'>
                                    <span>
                                        {localize('Stake per trade')} ({currency})
                                    </span>
                                    <input
                                        type='number'
                                        min='0.01'
                                        step='0.01'
                                        value={form.stake}
                                        onChange={event => updateField('stake', event.target.value)}
                                        data-testid='bulk-trader-stake'
                                    />
                                    {fieldErrors.stake && (
                                        <small className='bulk-trader__field-error'>{fieldErrors.stake}</small>
                                    )}
                                </label>
                                <label className='bulk-trader__field'>
                                    <span>{localize('Number of trades')}</span>
                                    <input
                                        type='number'
                                        min='1'
                                        max='50'
                                        step='1'
                                        value={form.numberOfTrades}
                                        onChange={event => updateField('numberOfTrades', event.target.value)}
                                        data-testid='bulk-trader-number-of-trades'
                                    />
                                    {fieldErrors.numberOfTrades && (
                                        <small className='bulk-trader__field-error'>{fieldErrors.numberOfTrades}</small>
                                    )}
                                </label>
                            </div>

                            {isOptionsLoading && (
                                <p className='bulk-trader__loading'>{localize('Updating available contract options…')}</p>
                            )}
                            <div className='bulk-trader__actions'>
                                <button type='submit' disabled={isOptionsLoading || !symbols.length}>
                                    {localize('Review trades')}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className='bulk-trader__review'>
                            <div className='bulk-trader__summary'>
                                <div>
                                    <span>{localize('Market')}</span>
                                    <strong>{selectedSymbol?.label || form.symbol}</strong>
                                    <small>{form.symbol}</small>
                                </div>
                                <div>
                                    <span>{localize('Contract')}</span>
                                    <strong>{selectedContractType?.label || form.contractType}</strong>
                                    <small>{selectedTradeType?.label || form.tradeType}</small>
                                </div>
                                <div>
                                    <span>{localize('Duration')}</span>
                                    <strong>
                                        {form.duration} {selectedDuration?.label || form.durationUnit}
                                    </strong>
                                </div>
                                <div>
                                    <span>{localize('Batch')}</span>
                                    <strong>
                                        {form.numberOfTrades} × {form.stake} {currency}
                                    </strong>
                                    <small>
                                        {localize('Total proposed stake')}: {Number(form.numberOfTrades) * Number(form.stake)}{' '}
                                        {currency}
                                    </small>
                                </div>
                            </div>
                            <div className='bulk-trader__notice bulk-trader__notice--warning'>
                                {localize(
                                    'Review only: the simulation below does not call buy, does not request a proposal, and cannot place real trades.'
                                )}
                            </div>
                            <div className='bulk-trader__actions'>
                                <button type='button' className='bulk-trader__secondary-button' onClick={() => setStep('configure')}>
                                    {localize('Edit batch')}
                                </button>
                                <button type='button' onClick={simulateTrades} disabled={isSimulating}>
                                    {isSimulating ? localize('Simulating…') : localize('Run safe simulation')}
                                </button>
                            </div>
                        </div>
                    )}

                    {status && (
                        <div
                            className={`bulk-trader__notice bulk-trader__notice--${status.kind}`}
                            role={status.kind === 'error' ? 'alert' : 'status'}
                        >
                            {status.message}
                        </div>
                    )}
                </section>

                <aside className='bulk-trader__side-card'>
                    <p className='bulk-trader__eyebrow'>{localize('Safety first')}</p>
                    <h2>{localize('What happens next?')}</h2>
                    <ol>
                        <li>{localize('Choose one market and contract setup.')}</li>
                        <li>{localize('Review the complete batch before continuing.')}</li>
                        <li>{localize('Run a local simulation with no API trade request.')}</li>
                    </ol>
                    <p>
                        {localize(
                            'Real execution is deliberately unavailable until the existing Deriv purchase function is identified, verified, and connected behind a separate user-confirmed flow.'
                        )}
                    </p>
                    <button type='button' className='bulk-trader__link-button' onClick={() => navigate('/')}>
                        {localize('Back to Bot Builder')}
                    </button>
                </aside>
            </div>
        </main>
    );
});

const BulkTrader = observer(() => {
    const store = useStore();

    if (!store) {
        return (
            <main className='bulk-trader'>
                <div className='bulk-trader__state'>{localize('Preparing your trading workspace…')}</div>
            </main>
        );
    }

    return <BulkTraderContent store={store} />;
});

export default BulkTrader;