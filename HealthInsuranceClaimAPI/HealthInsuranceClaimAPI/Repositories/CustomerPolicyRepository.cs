using HealthInsuranceClaimAPI.Data;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;
using Microsoft.EntityFrameworkCore;

namespace HealthInsuranceClaimAPI.Repositories
{
    public class CustomerPolicyRepository : GenericRepository<CustomerPolicy>, ICustomerPolicyRepository
    {
        public CustomerPolicyRepository(HealthInsuranceContext context) : base(context)
        {
        }

        public async Task<IEnumerable<CustomerPolicy>> GetByCustomerIdAsync(int customerId)
        {
            return await _dbSet
                .Where(cp => cp.CustomerId == customerId)
                .Include(cp => cp.Policy)
                .Include(cp => cp.Customer)
                .Include(cp => cp.Claims)
                .ToListAsync();
        }

        public async Task<bool> HasActivePolicyAsync(int customerId, int policyId)
        {
            return await _dbSet
                .AnyAsync(cp => cp.CustomerId == customerId && cp.PolicyId == policyId && cp.Status == PolicyStatus.Active);
        }

        public async Task<int> GetActiveCountByPolicyIdAsync(int policyId)
        {
            return await _dbSet
                .CountAsync(cp => cp.PolicyId == policyId && cp.Status == PolicyStatus.Active);
        }

        public async Task<CustomerPolicy?> GetByPolicyNumberAsync(string policyNumber)
        {
            return await _dbSet
                .Include(cp => cp.Customer)
                .Include(cp => cp.Policy)
                .Where(cp => cp.PolicyNumber == policyNumber)
                .FirstOrDefaultAsync();
        }
    }
}