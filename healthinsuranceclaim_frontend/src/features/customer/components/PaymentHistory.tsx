import { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { customerApi } from '../services/customerApi';

interface Payment {
  id: number;
  amount: number;
  transactionDate: string;
  paymentMethod: string;
  status: number;
  policyName: string;
  transactionNumber: string;
  paymentType: number;
  claimNumber?: string;
}

export const PaymentHistory = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await customerApi.getPaymentHistory() as Payment[];
        setPayments(data);
      } catch (error) {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  if (loading) return <Typography>Loading payment history...</Typography>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Payment History</Typography>
      {payments.length === 0 ? (
        <Typography color="textSecondary">No payment history found</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Policy</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.transactionDate).toLocaleDateString()}</TableCell>
                  <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    {payment.policyName || payment.claimNumber || 
                     (payment.paymentType === 1 ? 'Policy Premium' : 
                      payment.paymentType === 2 ? 'Claim Payment' : 'Payment')}
                  </TableCell>
                  <TableCell>{payment.paymentMethod || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={payment.status === 2 ? 'Completed' : payment.status === 1 ? 'Pending' : 'Failed'} 
                      color={payment.status === 2 ? 'success' : payment.status === 1 ? 'warning' : 'error'} 
                      size="small" 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};