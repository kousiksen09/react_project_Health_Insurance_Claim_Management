import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { claimOfficerApi } from '../services/claimOfficerApi';

export const useClaimProcessing = () => {
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const processClaim = async (claimId: number, action: 'approve' | 'reject' | 'request-documents', data: any) => {
    try {
      setLoading(true);
      
      let result: string;
      switch (action) {
        case 'approve':
          result = await claimOfficerApi.approveClaim(claimId, data.approvedAmount);
          break;
        case 'reject':
          result = await claimOfficerApi.rejectClaim(claimId, data.rejectionReason);
          break;
        case 'request-documents':
          result = await claimOfficerApi.requestDocuments(claimId, data.documentRequest);
          break;
        default:
          throw new Error('Invalid action');
      }
      
      enqueueSnackbar(result, { variant: 'success' });
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to process claim';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    processClaim,
    loading
  };
};