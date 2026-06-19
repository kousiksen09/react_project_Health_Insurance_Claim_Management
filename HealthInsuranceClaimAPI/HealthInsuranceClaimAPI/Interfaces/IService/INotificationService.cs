using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface INotificationService
    {
        Task CreateNotificationAsync(int userId, string title, string message, NotificationType type);
        Task CreateNotificationWithEmailAsync(int userId, string title, string message, NotificationType type);
        Task<List<Notification>> GetUserNotificationsAsync(int userId);
        Task MarkAsReadAsync(int notificationId, int userId);
    }
}
