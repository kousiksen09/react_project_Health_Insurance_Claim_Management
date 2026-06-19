using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.DTOs;
using System.Security.Claims;

namespace HealthInsuranceClaimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "ClaimOfficer,Admin")]
    public class ClaimOfficerController : ControllerBase
    {
        private readonly IClaimOfficerService _claimOfficerService;

        public ClaimOfficerController(IClaimOfficerService claimOfficerService)
        {
            _claimOfficerService = claimOfficerService;
        }

        [HttpGet("profile")]
        public async Task<ActionResult> GetProfile()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var profile = await _claimOfficerService.GetProfileAsync(userId);
            return Ok(profile);
        }

        [HttpPut("profile")]
        public async Task<ActionResult> UpdateProfile([FromForm] UpdateClaimOfficerProfileDto updateDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _claimOfficerService.UpdateProfileAsync(userId, updateDto);
            return Ok(result);
        }

        [HttpGet("claims/pending")]
        public async Task<ActionResult> GetPendingClaims()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var claims = await _claimOfficerService.GetPendingClaimsAsync(userId);
            return Ok(claims);
        }

        [HttpGet("claims")]
        public async Task<ActionResult> GetAllClaims()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var claims = await _claimOfficerService.GetAllClaimsAsync(userId);
            return Ok(claims);
        }

        [HttpGet("claims/{id}")]
        public async Task<ActionResult> GetClaimDetails(int id)
        {
            var claim = await _claimOfficerService.GetClaimDetailsAsync(id);
            return Ok(claim);
        }

        [HttpPut("claims/{id}/approve")]
        public async Task<ActionResult> ApproveClaim(int id, [FromForm] decimal? approvedAmount)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _claimOfficerService.ApproveClaimAsync(id, approvedAmount, userId);
            return Ok(result);
        }

        [HttpPut("claims/{id}/reject")]
        public async Task<ActionResult> RejectClaim(int id, [FromForm] string rejectionReason)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _claimOfficerService.RejectClaimAsync(id, rejectionReason, userId);
            return Ok(result);
        }

        [HttpPut("claims/{id}/request-documents")]
        public async Task<ActionResult> RequestDocuments(int id, [FromForm] string documentRequest)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _claimOfficerService.RequestDocumentsAsync(id, documentRequest, userId);
            return Ok(result);
        }

        [HttpPost("claims/{id}/calculate-amount")]
        public async Task<ActionResult> CalculateApprovedAmount(int id, [FromForm] decimal requestedAmount)
        {
            var amount = await _claimOfficerService.CalculateApprovedAmountAsync(id, requestedAmount);
            return Ok(new { ApprovedAmount = amount });
        }

        [HttpPut("claims/{id}/process-payment")]
        public async Task<ActionResult> ProcessPayment(int id)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _claimOfficerService.ProcessPaymentAsync(id, userId);
            return Ok(result);
        }

        [HttpGet("claims/{id}/documents")]
        public async Task<ActionResult> GetClaimDocuments(int id)
        {
            var documents = await _claimOfficerService.GetClaimDocumentsAsync(id);
            return Ok(documents);
        }

        [HttpGet("documents/{documentId}/download")]
        public async Task<ActionResult> DownloadDocument(int documentId)
        {
            var fileResult = await _claimOfficerService.DownloadDocumentAsync(documentId);
            return File(fileResult.FileBytes, "application/octet-stream", fileResult.FileName);
        }

        [HttpPut("claims/{id}/process")]
        public async Task<ActionResult> ProcessClaim(int id, [FromForm] ProcessClaimDto processData)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return Ok(new { success = false, message = string.Join(", ", errors) });
            }

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            
            if (processData.Status == HealthInsuranceClaimAPI.Enums.ClaimStatus.DocumentsRequested)
            {
                if (string.IsNullOrWhiteSpace(processData.DocumentRequest))
                {
                    return Ok(new { success = false, message = "Document request message is required when requesting documents" });
                }
            }
            
            string result = processData.Status switch
            {
                HealthInsuranceClaimAPI.Enums.ClaimStatus.Approved => await _claimOfficerService.ApproveClaimAsync(id, processData.ApprovedAmount, userId),
                HealthInsuranceClaimAPI.Enums.ClaimStatus.Rejected => await _claimOfficerService.RejectClaimAsync(id, processData.RejectionReason!, userId),
                HealthInsuranceClaimAPI.Enums.ClaimStatus.DocumentsRequested => await _claimOfficerService.RequestDocumentsAsync(id, processData.DocumentRequest ?? "Additional documents required", userId),
                HealthInsuranceClaimAPI.Enums.ClaimStatus.Paid => await _claimOfficerService.ProcessPaymentAsync(id, userId),
                _ => throw new ArgumentException("Invalid status for processing")
            };
            
            return Ok(result);
        }
    }
}