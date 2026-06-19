using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.DTOs;
using AutoMapper;
using System.Security.Claims;

namespace HealthInsuranceClaimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly IMapper _mapper;

        public NotificationsController(INotificationService notificationService, IMapper mapper)
        {
            _notificationService = notificationService;
            _mapper = mapper;
        }

        [HttpGet]
        public async Task<ActionResult<List<NotificationDto>>> GetNotifications()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var notifications = await _notificationService.GetUserNotificationsAsync(userId);
            var notificationDtos = _mapper.Map<List<NotificationDto>>(notifications);
            return Ok(notificationDtos);
        }

        [HttpPut("{id}/read")]
        public async Task<ActionResult> MarkAsRead(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            await _notificationService.MarkAsReadAsync(id, userId);
            return Ok();
        }
    }
}