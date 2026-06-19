using HealthInsuranceClaimAPI.Data;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthInsuranceClaimAPI.Repositories
{
    public class HospitalRepository : GenericRepository<Hospital>, IHospitalRepository
    {
        public HospitalRepository(HealthInsuranceContext context) : base(context)
        {
        }

        public async Task<Hospital?> GetByUserIdAsync(int userId)
        {
            return await _dbSet.FirstOrDefaultAsync(h => h.UserId == userId);
        }

        public async Task<bool> LicenseExistsAsync(string licenseNumber)
        {
            return await _dbSet.AnyAsync(h => h.LicenseNumber == licenseNumber);
        }

        public new async Task<int> GetCountAsync()
        {
            return await _dbSet.CountAsync();
        }

        public async Task<IEnumerable<Hospital>> GetAllWithUserAsync()
        {
            return await _dbSet.Include(h => h.User).ToListAsync();
        }
    }
}