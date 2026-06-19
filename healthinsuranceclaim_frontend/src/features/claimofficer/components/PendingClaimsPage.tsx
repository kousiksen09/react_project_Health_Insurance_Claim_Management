import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { claimOfficerApi } from '../services/claimOfficerApi';

interface Claim {
  id: number;
  claimNumber: string;
  claimAmount: number;
  treatmentDetails: string;
  treatmentDate: string;
  submissionDate: string;
  status: number;
  rejectionReason?: string;
  documentRequest?: string;
  approvedAmount?: number;
  processedDate?: string;
  customerName: string;
  hospitalName: string;
  claimOfficerName?: string;
}

export const PendingClaimsPage = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [claimDocuments, setClaimDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetchPendingClaims();
  }, []);

  const fetchingRef = useRef(false);

  const fetchPendingClaims = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    try {
      const claimsData = await claimOfficerApi.getPendingClaims() as Claim[];
      setClaims(claimsData);
    } catch (error) {
      setError('Failed to fetch pending claims');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const handleApproveClaim = async (claim: Claim) => {
    setSelectedClaim(claim);
    
    // Get auto-calculated amount
    try {
      const result = await claimOfficerApi.calculateAmount(claim.id, claim.claimAmount) as { approvedAmount: number };
      setCalculatedAmount(result.approvedAmount || claim.claimAmount);
    } catch (error) {
      setCalculatedAmount(claim.claimAmount);
    }
    
    setApproveDialogOpen(true);
  };

  const handleRejectClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleViewDocuments = async (claim: Claim) => {
    setSelectedClaim(claim);
    try {
      const documents = await claimOfficerApi.getClaimDocuments(claim.id) as any[];
      setClaimDocuments(documents);
      setDocumentsDialogOpen(true);
    } catch (error) {
      setError('Failed to fetch claim documents');
    }
  };

  const handleDownloadDocument = async (documentId: number) => {
    try {
      await claimOfficerApi.downloadDocument(documentId);
    } catch (error) {
      setError('Failed to download document');
    }
  };

  const handleApproveSubmit = async () => {
    if (!selectedClaim) return;

    try {
      await claimOfficerApi.approveClaim(selectedClaim.id);
      setApproveDialogOpen(false);
      setSelectedClaim(null);
      fetchPendingClaims();
    } catch (error: any) {
      console.error('Approve claim error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve claim';
      setError(errorMessage);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedClaim || !rejectionReason.trim()) return;

    try {
      await claimOfficerApi.rejectClaim(selectedClaim.id, rejectionReason);
      setRejectDialogOpen(false);
      setSelectedClaim(null);
      fetchPendingClaims();
    } catch (error: any) {
      console.error('Reject claim error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reject claim';
      setError(errorMessage);
    }
  };

  const columns: GridColDef[] = [
    { field: 'claimNumber', headerName: 'Claim Number', width: 150 },
    { field: 'customerName', headerName: 'Customer', width: 200 },
    { field: 'hospitalName', headerName: 'Hospital', width: 200 },
    { field: 'claimAmount', headerName: 'Requested', width: 120, renderCell: (params) => `₹${(params.value || 0).toLocaleString()}` },
    { field: 'approvedAmount', headerName: 'Approved', width: 120, renderCell: (params) => params.value ? `₹${params.value.toLocaleString()}` : '-' },
    { field: 'treatmentDate', headerName: 'Treatment Date', width: 130, renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString() : '-' },
    { field: 'submissionDate', headerName: 'Submitted', width: 130, renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString() : '-' },
    { field: 'treatmentDetails', headerName: 'Treatment Details', width: 200 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<Visibility />}
          label="View Documents"
          onClick={() => handleViewDocuments(params.row)}
          color="primary"
        />,
        <GridActionsCellItem
          icon={<CheckCircle />}
          label="Approve"
          onClick={() => handleApproveClaim(params.row)}
          color="success"
        />,
        <GridActionsCellItem
          icon={<Cancel />}
          label="Reject"
          onClick={() => handleRejectClaim(params.row)}
          color="error"
        />,
      ],
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pending Claims
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={claims}
          columns={columns}
          loading={loading}
        />
      </Paper>

      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Claim</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Claim: {selectedClaim?.claimNumber}</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Requested Amount: ₹{selectedClaim?.claimAmount.toLocaleString()}
            </Typography>
            <Alert severity="success" sx={{ mt: 2 }}>
              <strong>Auto-calculated approved amount: ₹{calculatedAmount.toLocaleString()}</strong>
              <br />
              <small>Calculated based on policy type and coverage limits</small>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleApproveSubmit} variant="contained" color="success">
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Claim</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Claim: {selectedClaim?.claimNumber}</Typography>
            <TextField
              fullWidth
              label="Rejection Reason"
              multiline
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              sx={{ mt: 2 }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRejectSubmit} 
            variant="contained" 
            color="error"
            disabled={!rejectionReason.trim()}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={documentsDialogOpen} onClose={() => setDocumentsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Claim Documents - {selectedClaim?.claimNumber}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {claimDocuments.length === 0 ? (
              <Typography>No documents uploaded for this claim.</Typography>
            ) : (
              claimDocuments.map((doc) => (
                <Box key={doc.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, border: '1px solid #ddd', mb: 1, borderRadius: 1 }}>
                  <Box>
                    <Typography variant="subtitle2">{doc.fileName}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Type: {doc.documentType} | Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => handleDownloadDocument(doc.id)}
                  >
                    Download
                  </Button>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};