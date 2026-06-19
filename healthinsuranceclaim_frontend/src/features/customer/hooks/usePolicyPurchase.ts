import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { customerApi } from '../services/customerApi';

interface PurchasePolicyData {
  policyId: number;
  paymentMethod: string;
  transactionNumber: string;
  notes?: string;
}

export const usePolicyPurchase = () => {
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const purchasePolicy = async (data: PurchasePolicyData) => {
    try {
      setLoading(true);
      const result = await customerApi.purchasePolicy(data);
      enqueueSnackbar('Policy purchased successfully!', { variant: 'success' });
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to purchase policy';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const renewPolicy = async (customerPolicyId: number, paymentMethod: string, transactionNumber: string) => {
    try {
      setLoading(true);
      const result = await customerApi.renewPolicy(customerPolicyId, paymentMethod, transactionNumber);
      enqueueSnackbar('Policy renewed successfully!', { variant: 'success' });
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to renew policy';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    purchasePolicy,
    renewPolicy,
    loading
  };
};