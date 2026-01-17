import React, { useState, useEffect } from 'react';
import { Calculator, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/financialUtils';

const DeferredCalculator = () => {
    const [amount, setAmount] = useState('');
    const [months, setMonths] = useState(12);
    const [rate, setRate] = useState(0); // Tasa mensual (0 si es MSI)
    const [result, setResult] = useState(null);

    const calculate = () => {
        const p = parseFloat(amount);
        const n = parseFloat(months);
        const i = parseFloat(rate) / 100;

        if (!p || !n) {
            setResult(null);
            return;
        }

        let monthlyPayment = 0;
        let totalPayment = 0;

        if (i === 0) {
            monthlyPayment = p / n;
            totalPayment = p;
        } else {
            // Fórmula de anualidad: A = P * (i * (1+i)^n) / ((1+i)^n - 1)
            monthlyPayment = p * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
            totalPayment = monthlyPayment * n;
        }

        setResult({
            monthly: monthlyPayment,
            total: totalPayment,
            interest: totalPayment - p
        });
    };

    useEffect(() => {
        calculate();
    }, [amount, months, rate]);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Calculator size={20} />
                </div>
                <h3 className="font-bold text-gray-800">Calculadora de Diferidos</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Monto a Pagar</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Plazo (Meses)</label>
                        <input
                            type="number"
                            value={months}
                            onChange={(e) => setMonths(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Interés Mensual (%)</label>
                        <input
                            type="number"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0"
                        />
                    </div>
                </div>

                {result && (
                    <div className="bg-gray-50 p-4 rounded-lg mt-4 animate-fadeIn">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-gray-500 text-sm">Cuota Mensual:</span>
                            <span className="text-xl font-bold text-indigo-600">{formatCurrency(result.monthly)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                            <span className="text-gray-500">Total a Pagar:</span>
                            <span className="font-medium text-gray-800">{formatCurrency(result.total)}</span>
                        </div>
                        {result.interest > 0 && (
                            <div className="flex justify-between items-center text-xs mt-1 text-red-500">
                                <span>Intereses:</span>
                                <span>+{formatCurrency(result.interest)}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeferredCalculator;
