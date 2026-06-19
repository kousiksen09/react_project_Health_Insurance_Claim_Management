using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Interfaces.IService;
using HealthInsuranceClaimAPI.Enums;
using System.Security.Claims;

namespace HealthInsuranceClaimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PoliciesController : ControllerBase
    {
        private readonly IPolicyService _policyService;

        public PoliciesController(IPolicyService policyService)
        {
            _policyService = policyService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PolicyDto>>> GetPolicies()
        {
            var policies = await _policyService.GetPoliciesAsync();
            return Ok(policies);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PolicyDto>> GetPolicy(int id)
        {
            var policy = await _policyService.GetPolicyByIdAsync(id);
            
            if (policy == null)
            {
                return Ok(new { success = false, message = "Policy not found or inactive" });
            }

            return Ok(policy);
        }

        [HttpGet("search")]
        public async Task<ActionResult<IEnumerable<PolicyDto>>> SearchPolicies([FromQuery] string searchTerm)
        {
            var policies = await _policyService.SearchPoliciesAsync(searchTerm);
            return Ok(policies);
        }

        [HttpGet("filter")]
        public async Task<ActionResult<IEnumerable<PolicyDto>>> FilterPolicies(
            [FromQuery] PolicyType? policyType,
            [FromQuery] decimal? minPremium,
            [FromQuery] decimal? maxPremium,
            [FromQuery] decimal? minCoverage,
            [FromQuery] decimal? maxCoverage)
        {
            var policies = await _policyService.FilterPoliciesAsync(policyType, minPremium, maxPremium, minCoverage, maxCoverage);
            return Ok(policies);
        }


    }
}