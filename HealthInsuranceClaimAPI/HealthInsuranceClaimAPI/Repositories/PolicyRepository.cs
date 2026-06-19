using HealthInsuranceClaimAPI.Data;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthInsuranceClaimAPI.Repositories
{
    public class PolicyRepository : GenericRepository<Policy>, IPolicyRepository
    {
        public PolicyRepository(HealthInsuranceContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Policy>> GetActiveAsync()
        {
            return await _dbSet.Where(p => p.IsActive).ToListAsync();
        }

        public async Task<IEnumerable<Policy>> GetAllPoliciesAsync()
        {
            return await _dbSet.ToListAsync();
        }


    }
}