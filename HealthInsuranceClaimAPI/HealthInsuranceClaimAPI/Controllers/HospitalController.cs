using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Interfaces.IService;
using System.Security.Claims;

namespace HealthInsuranceClaimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Hospital")]
    public class HospitalController : ControllerBase
    {
        private readonly IHospitalService _hospitalService;

        public HospitalController(IHospitalService hospitalService)
        {
            _hospitalService = hospitalService;
        }

        [HttpGet("profile")]
        public async Task<ActionResult> GetProfile()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var profile = await _hospitalService.GetProfileAsync(userId);
            return Ok(profile);
        }

        [HttpPut("profile")]
        public async Task<ActionResult> UpdateProfile([FromForm] UpdateHospitalProfileDto updateDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _hospitalService.UpdateProfileAsync(userId, updateDto);
            return Ok(result);
        }

        [HttpPost("claims")]
        public async Task<ActionResult> SubmitClaim([FromForm] CreateClaimDto createClaimDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _hospitalService.SubmitClaimAsync(createClaimDto, userId);
            return Ok(result);
        }

        [HttpGet("claims")]
        public async Task<ActionResult> GetMyClaims()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var claims = await _hospitalService.GetMyClaimsAsync(userId);
            return Ok(claims);
        }

        [HttpGet("claims/status/{status}")]
        public async Task<ActionResult> GetClaimsByStatus(string status)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var claims = await _hospitalService.GetClaimsByStatusAsync(userId, status);
            return Ok(claims);
        }

        [HttpGet("customer-policy/{policyNumber}")]
        public async Task<ActionResult> GetCustomerPolicy(string policyNumber)
        {
            var policy = await _hospitalService.GetCustomerPolicyAsync(policyNumber);
            return Ok(policy);
        }

        [HttpGet("customer/{customerId}/policies")]
        public async Task<ActionResult> GetCustomerPolicies(int customerId)
        {
            var policies = await _hospitalService.GetCustomerPoliciesAsync(customerId);
            return Ok(policies);
        }

        [HttpPost("claims/{claimId}/upload-documents")]
        public async Task<ActionResult> UploadAdditionalDocuments(int claimId, [FromForm] List<IFormFile> documents, [FromForm] List<string> documentTypes)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _hospitalService.UploadAdditionalDocumentsAsync(claimId, documents, documentTypes, userId);
            return Ok(result);
        }
    }
}