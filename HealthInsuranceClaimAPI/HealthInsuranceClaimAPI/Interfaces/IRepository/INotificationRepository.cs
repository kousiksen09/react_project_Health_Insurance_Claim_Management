using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IRepository
{
    public interface INotificationRepository : IGenericRepository<Notification>
    {
        Task<List<Notification>> GetByUserIdAsync(int userId);
    }
}
