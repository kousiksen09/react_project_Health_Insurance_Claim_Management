using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IRepository
{
    public interface ICustomerPolicyRepository : IGenericRepository<CustomerPolicy>
    {
        Task<IEnumerable<CustomerPolicy>> GetByCustomerIdAsync(int customerId);
        Task<bool> HasActivePolicyAsync(int customerId, int policyId);
        Task<int> GetActiveCountByPolicyIdAsync(int policyId);
        Task<CustomerPolicy?> GetByPolicyNumberAsync(string policyNumber);
    }
}
