import { useState } from 'react';
import { Box, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem, Chip, Alert, CircularProgress } from '@mui/material';
import { Upload } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { hospitalApi } from '../services/hospitalApi';
import { DOCUMENT_TYPE_OPTIONS } from '../../../shared/utils/documentTypes';

export const DocumentUpload = () => {
  const [claimNumber, setClaimNumber] = useState('');
  const [documents, setDocuments] = useState<File[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setDocuments(files);
    setDocumentTypes(files.map(() => DOCUMENT_TYPE_OPTIONS[0].value));
  };

  const handleDocTypeChange = (index: number, type: string) => {
    const newTypes = [...documentTypes];
    newTypes[index] = type;
    setDocumentTypes(newTypes);
  };

  const handleUpload = async () => {
    if (!claimNumber.trim()) {
      enqueueSnackbar('Please enter a claim number', { variant: 'error' });
      return;
    }
    
    if (documents.length === 0) {
      enqueueSnackbar('Please select documents to upload', { variant: 'error' });
      return;
    }

    if (documents.length !== documentTypes.length) {
      enqueueSnackbar('Please select document type for each file', { variant: 'error' });
      return;
    }

    // Check if any document type is empty
    if (documentTypes.some(type => !type)) {
      enqueueSnackbar('Please select document type for all files', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      
      // First, check if the claim exists and has the correct status
      let claim;
      try {
        claim = await hospitalApi.getClaimByNumber(claimNumber);
        
        // Status 3 = DocumentsRequested (based on ClaimStatus enum)
        if (claim.status !== 3) {
          const statusNames = {
            0: 'Submitted',
            1: 'Under Review', 
            2: 'Approved',
            3: 'Documents Requested',
            4: 'Rejected',
            5: 'Paid'
          };
          const currentStatus = statusNames[claim.status as keyof typeof statusNames] || 'Unknown';
          enqueueSnackbar(`Cannot upload documents. Claim status is "${currentStatus}". Documents can only be uploaded for claims with "Documents Requested" status.`, { variant: 'error' });
          return;
        }
      } catch (claimError: any) {
        enqueueSnackbar('Claim not found or you do not have access to this claim', { variant: 'error' });
        return;
      }
      

      await hospitalApi.uploadAdditionalDocuments(claim.id, documents, documentTypes);
      enqueueSnackbar('Documents uploaded successfully!', { variant: 'success' });
      
      // Reset form
      setClaimNumber('');
      setDocuments([]);
      setDocumentTypes([]);
      const fileInput = document.getElementById('document-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      let errorMessage = 'Failed to upload documents';
      
      if (error.response?.data) {
        // Handle validation errors from ASP.NET Core
        if (error.response.data.errors) {
          const errors = Object.values(error.response.data.errors).flat();
          errorMessage = errors.join(', ');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Upload Additional Documents
      </Typography>
      
      <Alert severity="info" sx={{ mb: 2 }}>
        Documents can only be uploaded for claims with "Documents Requested" status. 
        Make sure the claim number is correct and the claim requires additional documents.
      </Alert>
      


      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TextField
          label="Claim Number"
          value={claimNumber}
          onChange={(e) => setClaimNumber(e.target.value)}
          placeholder="Enter the claim number (e.g., CLM20241119xxxx)"
          fullWidth
        />

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Select Documents
          </Typography>
          <input
            id="document-upload"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileChange}
            style={{ marginBottom: '16px' }}
          />
          
          {documents.map((file, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Chip label={file.name} />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Document Type</InputLabel>
                <Select
                  value={documentTypes[index] || ''}
                  label="Document Type"
                  onChange={(e) => handleDocTypeChange(index, e.target.value)}
                >
                  {DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          ))}
        </Box>

        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <Upload />}
          onClick={handleUpload}
          disabled={loading || !claimNumber || documents.length === 0}
          sx={{ alignSelf: 'flex-start' }}
        >
          {loading ? 'Uploading...' : 'Upload Documents'}
        </Button>
      </Box>
    </Box>
  );
};