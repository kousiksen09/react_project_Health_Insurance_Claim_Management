import { useState } from 'react';
import { Box, Typography, Chip, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { hospitalApi } from '../services/hospitalApi';
import { useApiCache } from '../../../shared/hooks/useApiCache';

const CLAIM_STATUS_LABELS = {
  1: { label: 'Submitted', color: 'warning' as const },
  2: { label: 'Under Review', color: 'info' as const },
  3: { label: 'Documents Requested', color: 'warning' as const },
  4: { label: 'Approved', color: 'success' as const },
  5: { label: 'Rejected', color: 'error' as const },
  6: { label: 'Paid', color: 'success' as const }
};

export const HospitalClaims = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { data: claims, loading, error } = useApiCache(
    statusFilter === 'all' ? 'hospital-claims' : `hospital-claims-${statusFilter}`,
    () => statusFilter === 'all' 
      ? hospitalApi.getHospitalClaims()
      : hospitalApi.getClaimsByStatus(statusFilter)
  );

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">Failed to load claims</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">All Claims</Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by Status"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Claims</MenuItem>
            <MenuItem value="1">Submitted</MenuItem>
            <MenuItem value="2">Under Review</MenuItem>
            <MenuItem value="3">Documents Requested</MenuItem>
            <MenuItem value="4">Approved</MenuItem>
            <MenuItem value="5">Rejected</MenuItem>
            <MenuItem value="6">Paid</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Claim #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Treatment Date</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Approved</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(claims || []).map((claim: any) => {
              const status = CLAIM_STATUS_LABELS[claim.status as keyof typeof CLAIM_STATUS_LABELS];
              return (
                <TableRow key={claim.id}>
                  <TableCell>{claim.claimNumber}</TableCell>
                  <TableCell>{claim.customerName}</TableCell>
                  <TableCell>₹{claim.claimAmount?.toLocaleString()}</TableCell>
                  <TableCell>{new Date(claim.treatmentDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(claim.submissionDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip label={status?.label || 'Unknown'} color={status?.color || 'default'} size="small" />
                  </TableCell>
                  <TableCell>{claim.approvedAmount ? `₹${claim.approvedAmount.toLocaleString()}` : '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      {(!claims || claims.length === 0) && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">No claims found</Typography>
        </Box>
      )}
    </Box>
  );
};