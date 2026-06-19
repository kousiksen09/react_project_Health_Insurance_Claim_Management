using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.DTOs;

namespace HealthInsuranceClaimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        [HttpGet("profile")]
        public async Task<ActionResult> GetProfile()
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var profile = await _adminService.GetProfileAsync(userId);
            return Ok(profile);
        }

        [HttpPut("profile")]
        public async Task<ActionResult> UpdateProfile([FromForm] UpdateAdminProfileDto updateDto)
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var result = await _adminService.UpdateProfileAsync(userId, updateDto);
            return Ok(result);
        }

        [HttpGet("dashboard")]
        public async Task<ActionResult> GetDashboard()
        {
            var stats = await _adminService.GetDashboardAsync();
            return Ok(stats);
        }

        [HttpGet("users")]
        public async Task<ActionResult> GetAllUsers()
        {
            var users = await _adminService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpGet("customers")]
        public async Task<ActionResult> GetAllCustomers()
        {
            try
            {
                var customers = await _adminService.GetAllCustomersAsync();
                return Ok(customers);
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("customers/{id}/toggle-status")]
        public async Task<ActionResult> ToggleCustomerStatus(int id)
        {
            try
            {
                var result = await _adminService.ToggleCustomerStatusAsync(id);
                return Ok(new { success = true, message = result });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("hospitals")]
        public async Task<ActionResult> GetAllHospitals()
        {
            var hospitals = await _adminService.GetAllHospitalsAsync();
            return Ok(hospitals);
        }

        [HttpGet("policies")]
        public async Task<ActionResult> GetAllPolicies()
        {
            var policies = await _adminService.GetPoliciesAsync();
            return Ok(policies);
        }

        [HttpPut("users/{id}/toggle-status")]
        public async Task<ActionResult> ToggleUserStatus(int id)
        {
            var result = await _adminService.ToggleUserStatusAsync(id);
            return Ok(result);
        }

        [HttpDelete("users/{id}")]
        public async Task<ActionResult> DeleteUser(int id)
        {
            var result = await _adminService.DeleteUserAsync(id);
            return Ok(result);
        }

        [HttpGet("policies/{id}")]
        public async Task<ActionResult<PolicyDto>> GetPolicy(int id)
        {
            var policy = await _adminService.GetPolicyAsync(id);
            if (policy == null)
            {
                return Ok(new { success = false, message = "Policy not found" });
            }
            
            var policyDto = new PolicyDto
            {
                Id = policy.Id,
                PolicyId = policy.PolicyNumber,
                Name = policy.Name,
                Description = policy.Description,
                Premium = policy.Premium,
                CoverageAmount = policy.CoverageAmount,
                DurationMonths = policy.DurationMonths,
                PolicyType = policy.PolicyType,
                IsActive = policy.IsActive,
                CreatedAt = policy.CreatedAt
            };
            return Ok(policyDto);
        }

        [HttpPost("policies")]
        public async Task<ActionResult<PolicyResponseDto>> CreatePolicy([FromForm] CreatePolicyDto createPolicyDto)
        {
            var policy = new Policy
            {
                Name = createPolicyDto.Name,
                Description = createPolicyDto.Description,
                Premium = createPolicyDto.Premium,
                CoverageAmount = createPolicyDto.CoverageAmount,
                DurationMonths = createPolicyDto.DurationMonths,
                PolicyType = createPolicyDto.PolicyType
            };
            var createdPolicy = await _adminService.CreatePolicyAsync(policy);
            
            var response = new PolicyResponseDto
            {
                PolicyId = createdPolicy.Id,
                PolicyName = createdPolicy.Name,
                PolicyType = createdPolicy.PolicyType.ToString(),
                Description = createdPolicy.Description,
                CoverageAmount = createdPolicy.CoverageAmount,
                PremiumAmount = createdPolicy.Premium,
                DurationMonths = createdPolicy.DurationMonths,
                Status = createdPolicy.IsActive ? "Active" : "Inactive",
                CreatedAt = createdPolicy.CreatedAt
            };
            
            return Ok(new { success = true, data = response, message = "Policy created successfully" });
        }

        [HttpPut("policies/{id}")]
        public async Task<ActionResult> UpdatePolicy(int id, [FromForm] UpdatePolicyDto updatePolicyDto)
        {
            var policy = new Policy
            {
                Name = updatePolicyDto.Name,
                Description = updatePolicyDto.Description,
                Premium = updatePolicyDto.Premium,
                CoverageAmount = updatePolicyDto.CoverageAmount,
                DurationMonths = updatePolicyDto.DurationMonths,
                PolicyType = updatePolicyDto.PolicyType
            };
            var result = await _adminService.UpdatePolicyAsync(id, policy);
            return Ok(result);
        }



        [HttpPut("policies/{id}/toggle-status")]
        public async Task<ActionResult> TogglePolicyStatus(int id)
        {
            var result = await _adminService.TogglePolicyStatusAsync(id);
            return Ok(result);
        }

        [HttpDelete("policies/{id}")]
        public async Task<ActionResult> DeletePolicy(int id)
        {
            try
            {
                var result = await _adminService.DeletePolicyAsync(id);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("claim-officers")]
        public async Task<ActionResult<ClaimOfficerResponseDto>> AddClaimOfficer([FromForm] AddClaimOfficerDto addDto)
        {
            var result = await _adminService.AddClaimOfficerAsync(addDto);
            return Ok(result);
        }

        [HttpGet("claim-officers")]
        public async Task<ActionResult> GetClaimOfficers()
        {
            var officers = await _adminService.GetClaimOfficersAsync();
            return Ok(officers);
        }



        [HttpPut("claim-officers/{id}/toggle-status")]
        public async Task<ActionResult> ToggleClaimOfficerStatus(int id)
        {
            var result = await _adminService.ToggleClaimOfficerStatusAsync(id);
            return Ok(result);
        }



        [HttpDelete("claim-officers/{id}")]
        public async Task<ActionResult> DeleteClaimOfficer(int id)
        {
            var result = await _adminService.DeleteClaimOfficerAsync(id);
            return Ok(result);
        }

        [HttpGet("claims")]
        public async Task<ActionResult> GetAllClaims()
        {
            var claims = await _adminService.GetAllClaimsAsync();
            return Ok(claims);
        }

        [HttpPut("claims/{claimId}/assign-officer/{officerId}")]
        public async Task<ActionResult> AssignClaimOfficer(int claimId, int officerId)
        {
            var result = await _adminService.AssignClaimOfficerAsync(claimId, officerId);
            return Ok(result);
        }

        [HttpGet("claims-management")]
        public async Task<ActionResult> GetClaimsManagementData()
        {
            try
            {
                var claims = await _adminService.GetAllClaimsAsync();
                var claimOfficers = await _adminService.GetClaimOfficersAsync();
                
                return Ok(new { 
                    claims = claims,
                    claimOfficers = claimOfficers 
                });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = "Failed to fetch claims management data" });
            }
        }
    }
}