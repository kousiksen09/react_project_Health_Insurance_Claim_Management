using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Data;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Enums;
using System.Security.Claims;

namespace HealthInsuranceClaimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ClaimsController : ControllerBase
    {
        private readonly IClaimService _claimService;
        private readonly HealthInsuranceContext _context;
        private readonly INotificationService _notificationService;

        public ClaimsController(IClaimService claimService, HealthInsuranceContext context, INotificationService notificationService)
        {
            _claimService = claimService;
            _context = context;
            _notificationService = notificationService;
        }



        [HttpPost]
        [Authorize(Roles = "Hospital")]
        public async Task<ActionResult> CreateClaim([FromForm] CreateClaimDto createClaimDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _claimService.CreateClaimAsync(createClaimDto, userId);
            return Ok(result);
        }

        [HttpGet]
        [Authorize(Roles = "ClaimOfficer,Admin")]
        public async Task<ActionResult<IEnumerable<ClaimDto>>> GetClaims()
        {
            var claims = await _context.Claims
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .Include(c => c.ClaimOfficer)
                .Select(c => new ClaimDto
                {
                    Id = c.Id,
                    ClaimNumber = c.ClaimNumber,
                    ClaimAmount = c.ClaimAmount,
                    TreatmentDetails = c.TreatmentDetails,
                    TreatmentDate = c.TreatmentDate,
                    SubmissionDate = c.SubmissionDate,
                    Status = c.Status,
                    RejectionReason = c.RejectionReason,
                    ApprovedAmount = c.ApprovedAmount,
                    ProcessedDate = c.ProcessedDate,
                    CustomerName = $"{c.CustomerPolicy.Customer.FirstName} {c.CustomerPolicy.Customer.LastName}",
                    HospitalName = c.Hospital.Name,
                    ClaimOfficerName = c.ClaimOfficer != null ? $"{c.ClaimOfficer.FirstName} {c.ClaimOfficer.LastName}" : null
                })
                .ToListAsync();

            return Ok(claims);
        }

        [HttpPut("{id}/process")]
        [Authorize(Roles = "ClaimOfficer")]
        public async Task<ActionResult> ProcessClaim(int id, [FromForm] ProcessClaimDto processDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var claimOfficer = await _context.ClaimOfficers.FirstOrDefaultAsync(co => co.UserId == userId);
            
            if (claimOfficer == null)
            {
                return Ok(new { success = false, message = "Claim officer not found" });
            }

            var claim = await _context.Claims
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (claim == null)
            {
                return Ok(new { success = false, message = "Claim not found" });
            }

            claim.ClaimOfficerId = claimOfficer.Id;
            claim.Status = processDto.Status;
            claim.ProcessedDate = DateTime.UtcNow;

            if (processDto.Status == ClaimStatus.Rejected)
            {
                claim.RejectionReason = processDto.RejectionReason;
            }
            else if (processDto.Status == ClaimStatus.Approved)
            {
                claim.ApprovedAmount = processDto.ApprovedAmount ?? claim.ClaimAmount;
            }

            await _context.SaveChangesAsync();

            var statusMessage = processDto.Status switch
            {
                ClaimStatus.Approved => $"Your claim {claim.ClaimNumber} has been approved for ${claim.ApprovedAmount}",
                ClaimStatus.Rejected => $"Your claim {claim.ClaimNumber} has been rejected. Reason: {claim.RejectionReason}",
                _ => $"Your claim {claim.ClaimNumber} status has been updated to {processDto.Status}"
            };

            await _notificationService.CreateNotificationAsync(
                claim.CustomerPolicy.Customer.UserId,
                "Claim Status Update",
                statusMessage,
                NotificationType.ClaimStatusUpdate
            );

            await _notificationService.CreateNotificationAsync(
                claim.Hospital.UserId,
                "Claim Status Update",
                statusMessage,
                NotificationType.ClaimStatusUpdate
            );

            return Ok("Claim processed successfully");
        }

        [HttpGet("my-claims")]
        [Authorize(Roles = "Customer")]
        public async Task<ActionResult> GetMyClaims()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var customer = await _context.Customers.FirstOrDefaultAsync(c => c.UserId == userId);
            
            if (customer == null)
            {
                return Ok(new { success = false, message = "Customer not found" });
            }

            var claims = await _context.Claims
                .Where(c => c.CustomerPolicy.CustomerId == customer.Id)
                .Include(c => c.Hospital)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Policy)
                .Select(c => new ClaimDto
                {
                    Id = c.Id,
                    ClaimNumber = c.ClaimNumber,
                    ClaimAmount = c.ClaimAmount,
                    TreatmentDetails = c.TreatmentDetails,
                    TreatmentDate = c.TreatmentDate,
                    SubmissionDate = c.SubmissionDate,
                    Status = c.Status,
                    RejectionReason = c.RejectionReason,
                    ApprovedAmount = c.ApprovedAmount,
                    ProcessedDate = c.ProcessedDate,
                    CustomerName = $"{c.CustomerPolicy.Customer.FirstName} {c.CustomerPolicy.Customer.LastName}",
                    HospitalName = c.Hospital.Name
                })
                .ToListAsync();

            return Ok(claims);
        }

        [HttpGet("pending")]
        [Authorize(Roles = "ClaimOfficer")]
        public async Task<ActionResult> GetPendingClaims()
        {
            var claims = await _context.Claims
                .Where(c => c.Status == ClaimStatus.Submitted)
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .Select(c => new ClaimDto
                {
                    Id = c.Id,
                    ClaimNumber = c.ClaimNumber,
                    ClaimAmount = c.ClaimAmount,
                    TreatmentDetails = c.TreatmentDetails,
                    TreatmentDate = c.TreatmentDate,
                    SubmissionDate = c.SubmissionDate,
                    Status = c.Status,
                    CustomerName = $"{c.CustomerPolicy.Customer.FirstName} {c.CustomerPolicy.Customer.LastName}",
                    HospitalName = c.Hospital.Name
                })
                .ToListAsync();

            return Ok(claims);
        }

        [HttpPut("{id}/approve")]
        [Authorize(Roles = "ClaimOfficer")]
        public async Task<ActionResult> ApproveClaim(int id, [FromForm] decimal? approvedAmount)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var claimOfficer = await _context.ClaimOfficers.FirstOrDefaultAsync(co => co.UserId == userId);
            
            if (claimOfficer == null)
                return Ok(new { success = false, message = "Claim officer not found" });

            var claim = await _context.Claims
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (claim == null)
                return Ok(new { success = false, message = "Claim not found" });

            if (claim.Status != ClaimStatus.Submitted)
                return Ok(new { success = false, message = "Claim is not in submitted status" });

            claim.ClaimOfficerId = claimOfficer.Id;
            claim.Status = ClaimStatus.Approved;
            claim.ApprovedAmount = approvedAmount ?? claim.ClaimAmount;
            claim.ProcessedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                claim.CustomerPolicy.Customer.UserId,
                "Claim Approved",
                $"Your claim {claim.ClaimNumber} has been approved for ${claim.ApprovedAmount}",
                NotificationType.ClaimStatusUpdate
            );

            await _notificationService.CreateNotificationAsync(
                claim.Hospital.UserId,
                "Claim Approved",
                $"Claim {claim.ClaimNumber} has been approved for ${claim.ApprovedAmount}",
                NotificationType.ClaimStatusUpdate
            );

            return Ok("Claim approved successfully");
        }

        [HttpPut("{id}/reject")]
        [Authorize(Roles = "ClaimOfficer")]
        public async Task<ActionResult> RejectClaim(int id, [FromForm] string rejectionReason)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var claimOfficer = await _context.ClaimOfficers.FirstOrDefaultAsync(co => co.UserId == userId);
            
            if (claimOfficer == null)
                return Ok(new { success = false, message = "Claim officer not found" });

            var claim = await _context.Claims
                .Include(c => c.CustomerPolicy)
                    .ThenInclude(cp => cp.Customer)
                .Include(c => c.Hospital)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (claim == null)
                return Ok(new { success = false, message = "Claim not found" });

            if (claim.Status != ClaimStatus.Submitted)
                return Ok(new { success = false, message = "Claim is not in submitted status" });

            claim.ClaimOfficerId = claimOfficer.Id;
            claim.Status = ClaimStatus.Rejected;
            claim.RejectionReason = rejectionReason;
            claim.ProcessedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                claim.CustomerPolicy.Customer.UserId,
                "Claim Rejected",
                $"Your claim {claim.ClaimNumber} has been rejected. Reason: {rejectionReason}",
                NotificationType.ClaimStatusUpdate
            );

            await _notificationService.CreateNotificationAsync(
                claim.Hospital.UserId,
                "Claim Rejected",
                $"Claim {claim.ClaimNumber} has been rejected. Reason: {rejectionReason}",
                NotificationType.ClaimStatusUpdate
            );

            return Ok("Claim rejected successfully");
        }
    }
}