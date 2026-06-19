using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IRepository
{
    public interface IPolicyRepository : IGenericRepository<Policy>
    {
        Task<IEnumerable<Policy>> GetActiveAsync();
        Task<IEnumerable<Policy>> GetAllPoliciesAsync();
    }
}
