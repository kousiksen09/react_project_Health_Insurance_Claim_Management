using Microsoft.EntityFrameworkCore;
using HealthInsuranceClaimAPI.Data;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Repositories
{
    public class PaymentTransactionRepository : GenericRepository<PaymentTransaction>, IPaymentTransactionRepository
    {
        public PaymentTransactionRepository(HealthInsuranceContext context) : base(context)
        {
        }

        public async Task<IEnumerable<PaymentTransaction>> GetByCustomerIdAsync(int customerId)
        {
            var payments = await _context.PaymentTransactions
                .Where(pt => pt.CustomerPolicy!.Customer.Id == customerId)
                .Include(pt => pt.CustomerPolicy)
                    .ThenInclude(cp => cp!.Policy)
                .Include(pt => pt.CustomerPolicy)
                    .ThenInclude(cp => cp!.Customer)
                .Include(pt => pt.Claim)
                .OrderByDescending(pt => pt.TransactionDate)
                .ToListAsync();
            
            

            foreach (var payment in payments)
            {
                Console.WriteLine($"Payment {payment.Id}: CustomerPolicy={payment.CustomerPolicy?.Id}, Policy={payment.CustomerPolicy?.Policy?.Name}");
            }
            
            return payments;
        }

        public async Task<bool> TransactionExistsAsync(string transactionNumber)
        {
            return await _context.PaymentTransactions
                .AnyAsync(pt => pt.TransactionNumber == transactionNumber);
        }
    }
}