using HealthInsuranceClaimAPI.Interfaces.IRepository;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;

namespace HealthInsuranceClaimAPI.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly IEmailService _emailService;
        private readonly IUserRepository _userRepository;

        public NotificationService(
            INotificationRepository notificationRepository,
            IEmailService emailService,
            IUserRepository userRepository)
        {
            _notificationRepository = notificationRepository;
            _emailService = emailService;
            _userRepository = userRepository;
        }

        public async Task CreateNotificationAsync(int userId, string title, string message, NotificationType type)
        {
            
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                CreatedAt = DateTime.UtcNow
            };

            await _notificationRepository.CreateAsync(notification);
        }

        public async Task CreateNotificationWithEmailAsync(int userId, string title, string message, NotificationType type)
        {

            await CreateNotificationAsync(userId, title, message, type);

           

            try
            {
                var user = await _userRepository.GetByIdAsync(userId);
                if (user != null)
                {
                    await _emailService.SendEmailAsync(user.Email, title, message);
                }
            }
            catch
            {
               
            }
        }

        public async Task<List<Notification>> GetUserNotificationsAsync(int userId)
        {
            return await _notificationRepository.GetByUserIdAsync(userId);
        }

        public async Task MarkAsReadAsync(int notificationId, int userId)
        {
            var notification = await _notificationRepository.GetByIdAsync(notificationId);

            if (notification != null && notification.UserId == userId)
            {
                notification.IsRead = true;
                await _notificationRepository.UpdateAsync(notification);
            }
        }
    }
}