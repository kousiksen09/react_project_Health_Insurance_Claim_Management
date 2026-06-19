using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IRepository
{
    public interface IPaymentTransactionRepository : IGenericRepository<PaymentTransaction>
    {
        Task<IEnumerable<PaymentTransaction>> GetByCustomerIdAsync(int customerId);
        Task<bool> TransactionExistsAsync(string transactionNumber);
    }
}
