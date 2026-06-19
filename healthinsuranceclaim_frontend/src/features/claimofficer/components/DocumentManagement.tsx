import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip } from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Visibility, Assignment } from '@mui/icons-material';
import { claimOfficerApi } from '../services/claimOfficerApi';

export const DocumentManagement = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [claimDocuments, setClaimDocuments] = useState<any[]>([]);
  const [documentRequest, setDocumentRequest] = useState('');

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const claimsData = await claimOfficerApi.getAllClaims() as any[];
      setClaims(claimsData);
    } catch (error) {
      console.error('Failed to fetch claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocuments = async (claim: any) => {
    setSelectedClaim(claim);
    try {
      const documents = await claimOfficerApi.getClaimDocuments(claim.id) as any[];
      setClaimDocuments(documents);
      setDocumentsDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleRequestDocuments = (claim: any) => {
    setSelectedClaim(claim);
    setDocumentRequest('');
    setRequestDialogOpen(true);
  };

  const handleSubmitDocumentRequest = async () => {
    if (!selectedClaim || !documentRequest.trim()) return;
    
    try {
      await claimOfficerApi.requestDocuments(selectedClaim.id, documentRequest);
      setRequestDialogOpen(false);
      fetchClaims();
    } catch (error) {
      console.error('Failed to request documents:', error);
    }
  };

  const handleDownloadDocument = async (documentId: number) => {
    try {
      await claimOfficerApi.downloadDocument(documentId);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const getStatusLabel = (status: number) => {
    const statusMap: { [key: number]: string } = {
      1: 'Submitted',
      2: 'Under Review', 
      3: 'Documents Requested',
      4: 'Approved',
      5: 'Rejected',
      6: 'Paid'
    };
    return statusMap[status] || 'Unknown';
  };

  const getStatusColor = (status: number) => {
    const colorMap: { [key: number]: 'success' | 'warning' | 'error' | 'info' | 'default' } = {
      1: 'warning',
      2: 'info',
      3: 'warning', 
      4: 'success',
      5: 'error',
      6: 'success'
    };
    return colorMap[status] || 'default';
  };

  const columns: GridColDef[] = [
    { field: 'claimNumber', headerName: 'Claim Number', width: 150 },
    { field: 'customerName', headerName: 'Customer', width: 200 },
    { field: 'hospitalName', headerName: 'Hospital', width: 200 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120, 
      renderCell: (params: any) => (
        <Chip 
          label={getStatusLabel(params.value)} 
          color={getStatusColor(params.value)} 
          size="small" 
        />
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 200,
      getActions: (params: any) => [
        <GridActionsCellItem
          icon={<Visibility />}
          label="View Documents"
          onClick={() => handleViewDocuments(params.row)}
        />,
        <GridActionsCellItem
          icon={<Assignment />}
          label="Request Documents"
          onClick={() => handleRequestDocuments(params.row)}
        />
      ]
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Document Management</Typography>
      
      <Paper sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={claims}
          columns={columns}
          loading={loading}
          hideFooter
          disableColumnMenu
          disableColumnSorting
        />
      </Paper>

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
                  <Button variant="outlined" size="small" onClick={() => handleDownloadDocument(doc.id)}>
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

      <Dialog open={requestDialogOpen} onClose={() => setRequestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Additional Documents</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Claim: {selectedClaim?.claimNumber}</Typography>
            <TextField
              fullWidth
              label="Document Request Message"
              multiline
              rows={4}
              value={documentRequest}
              onChange={(e) => setDocumentRequest(e.target.value)}
              placeholder="Please specify which additional documents are required..."
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmitDocumentRequest} variant="contained" disabled={!documentRequest.trim()}>
            Send Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};