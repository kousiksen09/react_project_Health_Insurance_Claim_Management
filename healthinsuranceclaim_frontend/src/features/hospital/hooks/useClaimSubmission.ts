import { useState } from 'react';
import { useSnackbar } from 'notistack';
import { hospitalApi, type CreateClaimRequest } from '../services/hospitalApi';

export const useClaimSubmission = () => {
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const submitClaim = async (data: CreateClaimRequest) => {
    try {
      setLoading(true);
      const result = await hospitalApi.createClaim(data);
      enqueueSnackbar('Claim submitted successfully!', { variant: 'success' });
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to submit claim';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const uploadDocuments = async (claimId: number, documents: File[], documentTypes: string[]) => {
    try {
      setLoading(true);
      const result = await hospitalApi.uploadAdditionalDocuments(claimId, documents, documentTypes);
      enqueueSnackbar('Documents uploaded successfully!', { variant: 'success' });
      return result;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload documents';
      enqueueSnackbar(errorMessage, { variant: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitClaim,
    uploadDocuments,
    loading
  };
};
