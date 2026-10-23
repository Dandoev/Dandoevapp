// ============================================================
// E-Bike BNPL Platform - Utility Functions
// ============================================================
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format currency in Nigerian Naira
 */
export function formatNaira(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Calculate Bi-daily Installment (Every 2 days)
 */
/**
 * Calculate Bi-daily Installment (Every 2 days) - DandoEv Specific
 */
export function calculateInstallment(principal: number, monthlyInterestRate: number, tenureMonths: number): {
    installmentAmount: number;
    totalInterest: number;
    totalRepayable: number;
    numberOfInstallments: number;
    healthInsuranceFee: number;
    processingFee: number;
    totalSavings: number;
} {
    // 1. Principal is the full bike price (0% down payment)

    // 2. Interest: Flat monthly rate
    // Interest = Principal * (Rate/100) * Months
    const totalInterest = Math.round(principal * (monthlyInterestRate / 100) * tenureMonths);

    // Health Insurance: Fixed 60,000 NGN
    const healthInsuranceFee = 60000;
    // Processing Fee: Fixed 20,000
    const processingFee = 20000;

    // 4. Compulsory Savings
    // 1000 Naira per DAY. 
    // Total Days = Month * 30.
    const totalDays = tenureMonths * 30;
    const totalSavings = totalDays * 1000;

    // 5. Total Repayable
    // Includes Principal + Interest + Health Insurance + Processing + Savings
    const totalRepayable = principal + totalInterest + healthInsuranceFee + processingFee + totalSavings;

    // 6. Installments
    // Bi-daily (Every 2 days)
    const numberOfInstallments = Math.floor(totalDays / 2);
    const installmentAmount = Math.ceil(totalRepayable / numberOfInstallments);

    return {
        installmentAmount,
        totalInterest,
        totalRepayable,
        numberOfInstallments,
        healthInsuranceFee,
        processingFee,
        totalSavings
    };
}

/**
 * Calculate EMI (Deprecated - wraps calculateInstallment for compatibility)
 */
export function calculateEMI(principal: number, rate: number, months: number): number {
    return calculateInstallment(principal, rate, months).installmentAmount;
}

/**
 * Calculate total repayable amount (Deprecated - use calculateInstallment return value)
 */
export function calculateTotalRepayable(emi: number, tenureMonths: number): number {
    // Approximation for backward compatibility if needed, 
    // but better to use the object from calculateInstallment
    const days = tenureMonths * 30;
    const installments = Math.floor(days / 2);
    return emi * installments;
}

/**
 * Calculate service fee
 */
export function calculateServiceFee(loanAmount: number, feePercentage: number = 3): number {
    return Math.round(loanAmount * feePercentage / 100);
}

/**
 * Calculate down payment
 */
export function calculateDownPayment(price: number, percentage: number): number {
    return Math.round(price * percentage / 100);
}

/**
 * Format date to readable string
 */
export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Format date with time
 */
export function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDate(dateStr);
}

/**
 * Generate a risk score based on user data (simplified)
 */
export function generateRiskScore(monthlyIncome: number, loanAmount: number, tenure: number): number {
    const dti = (loanAmount / tenure) / monthlyIncome; // debt-to-income ratio
    let score = 100;
    if (dti > 0.5) score -= 40;
    else if (dti > 0.3) score -= 20;
    else if (dti > 0.2) score -= 10;
    if (monthlyIncome < 50000) score -= 15;
    if (monthlyIncome > 200000) score += 10;
    if (tenure > 12) score -= 10;
    return Math.max(0, Math.min(100, score));
}

/**
 * Get status badge color class
 */
export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        pending: 'badge-warning',
        under_review: 'badge-info',
        approved: 'badge-success',
        rejected: 'badge-danger',
        active: 'badge-success',
        completed: 'badge-primary',
        defaulted: 'badge-danger',
        paid: 'badge-success',
        overdue: 'badge-danger',
        failed: 'badge-danger',
        upcoming: 'badge-info',
        partial: 'badge-warning',
        in_stock: 'badge-success',
        out_of_stock: 'badge-danger',
        pre_order: 'badge-warning',
        verified: 'badge-success',
        invited: 'badge-info',
        accepted: 'badge-success',
        declined: 'badge-danger',
        registered: 'badge-primary',
        delivered: 'badge-success',
        shipped: 'badge-info',
        processing: 'badge-warning',
        confirmed: 'badge-primary',
        cancelled: 'badge-danger',
    };
    return colors[status] || 'badge-default';
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

/**
 * Generate a simple UUID v4
 */
export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Truncate text
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...';
}

/**
 * Validate Nigerian phone number
 */
export function isValidNigerianPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return /^(0|234)(70|80|81|90|91|71|80)\d{8}$/.test(cleaned);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate BVN (11 digits)
 */
export function isValidBVN(bvn: string): boolean {
    return /^\d{11}$/.test(bvn);
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): string {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
