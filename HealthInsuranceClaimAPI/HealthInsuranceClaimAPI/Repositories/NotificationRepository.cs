using HealthInsuranceClaimAPI.Data;
using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthInsuranceClaimAPI.Repositories
{
    public class NotificationRepository : GenericRepository<Notification>, INotificationRepository
    {
        public NotificationRepository(HealthInsuranceContext context) : base(context)
        {
        }

        public async Task<List<Notification>> GetByUserIdAsync(int userId)
        {
            return await _dbSet
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }
    }
}