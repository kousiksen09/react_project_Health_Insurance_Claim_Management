using HealthInsuranceClaimAPI.Data;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthInsuranceClaimAPI.Repositories
{
    public class CustomerRepository : GenericRepository<Customer>, ICustomerRepository
    {
        public CustomerRepository(HealthInsuranceContext context) : base(context)
        {
        }

        public async Task<Customer?> GetByUserIdAsync(int userId)
        {
            return await _dbSet.FirstOrDefaultAsync(c => c.UserId == userId);
        }

        public async Task<IEnumerable<Customer>> GetAllWithUserAsync()
        {
            return await _dbSet.Include(c => c.User).ToListAsync();
        }

        public new async Task<int> GetCountAsync()
        {
            return await _dbSet.CountAsync();
        }
    }
}