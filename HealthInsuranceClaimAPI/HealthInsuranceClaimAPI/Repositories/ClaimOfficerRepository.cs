using HealthInsuranceClaimAPI.Data;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthInsuranceClaimAPI.Repositories
{
    public class ClaimOfficerRepository : GenericRepository<ClaimOfficer>, IClaimOfficerRepository
    {
        public ClaimOfficerRepository(HealthInsuranceContext context) : base(context)
        {
        }

        public async Task<ClaimOfficer?> GetByUserIdAsync(int userId)
        {
            return await _dbSet.FirstOrDefaultAsync(co => co.UserId == userId);
        }

        public async Task<IEnumerable<object>> GetAllWithUserAsync()
        {
            return await _dbSet
                .Include(co => co.User)
                .Include(co => co.Claims)
                .Select(co => new
                {
                    co.Id,
                    co.FirstName,
                    co.LastName,
                    co.User.Email,
                    co.User.IsActive,
                    AssignedClaimsCount = co.Claims.Count(),
                    CreatedAt = co.User.CreatedAt
                })
                .ToListAsync();
        }

        public new async Task<int> GetCountAsync()
        {
            return await _dbSet.CountAsync();
        }

        public async Task<ClaimOfficer?> GetByIdWithUserAsync(int id)
        {
            return await _dbSet
                .Include(co => co.User)
                .FirstOrDefaultAsync(co => co.Id == id);
        }

        public async Task<User?> GetUserWithClaimOfficerAsync(int userId)
        {
            return await _context.Users
                .Include(u => u.ClaimOfficer)
                .FirstOrDefaultAsync(u => u.Id == userId);
        }

        public async Task UpdateUserAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }
    }
}