import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './client.ts';
import { Payment, DeviceInfo } from '../types/index.ts';

export function usePaymentQuery(paymentId?: string) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayment = useCallback(async () => {
    if (!paymentId) return;
    setIsLoading(true);
    try {
      const data = await apiClient.getPayment(paymentId);
      setPayment(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment');
    } finally {
      setIsLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  return { payment, isLoading, error, refetch: fetchPayment };
}

export function useCheckoutQuery(paymentId?: string) {
  const [data, setData] = useState<{
    payment: Payment;
    isLocked: boolean;
    lockedUntil?: number;
    attemptsRemaining: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCheckout = useCallback(async () => {
    if (!paymentId) return;
    setIsLoading(true);
    try {
      const result = await apiClient.getCheckoutPayment(paymentId);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load checkout');
    } finally {
      setIsLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    fetchCheckout();
  }, [fetchCheckout]);

  return { data, isLoading, error, refetch: fetchCheckout };
}

export function useDeviceStatusQuery() {
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getDeviceStatus();
      setDevice(res);
    } catch {
      // Ignored in offline/demo fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { device, isLoading, refetch: fetchStatus };
}
