using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Interfaces.IService;
using System.Security.Claims;

namespace HealthInsuranceClaimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Customer")]
    public class CustomerController : ControllerBase
    {
        private readonly ICustomerService _customerService;

        public CustomerController(ICustomerService customerService)
        {
            _customerService = customerService;
        }



        [HttpGet("profile")]
        public async Task<ActionResult> GetProfile()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var profile = await _customerService.GetProfileAsync(userId);
            return Ok(profile);
        }

        [HttpPost("purchase-policy")]
        public async Task<ActionResult> PurchasePolicy([FromForm] PurchasePolicyDto purchaseDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _customerService.PurchasePolicyAsync(purchaseDto, userId);
            return Ok(result);
        }

        [HttpGet("my-policies")]
        public async Task<ActionResult> GetMyPolicies()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var policies = await _customerService.GetMyPoliciesAsync(userId);
            return Ok(policies);
        }

        [HttpGet("my-claims")]
        public async Task<ActionResult> GetMyClaims()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var claims = await _customerService.GetMyClaimsAsync(userId);
            return Ok(claims);
        }

        [HttpGet("payment-history")]
        public async Task<ActionResult> GetPaymentHistory()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var payments = await _customerService.GetPaymentHistoryAsync(userId);
            return Ok(payments);
        }

        [HttpPut("profile")]
        public async Task<ActionResult> UpdateProfile([FromForm] UpdateCustomerProfileDto updateDto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _customerService.UpdateProfileAsync(userId, updateDto);
            return Ok(result);
        }

        [HttpPost("renew-policy/{customerPolicyId}")]
        public async Task<ActionResult> RenewPolicy(int customerPolicyId, [FromForm] string paymentMethod, [FromForm] string transactionNumber)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _customerService.RenewPolicyAsync(customerPolicyId, userId, paymentMethod, transactionNumber);
            return Ok(result);
        }

        [HttpGet("premium-quote/{policyId}")]
        public async Task<ActionResult> GetPremiumQuote(int policyId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var quote = await _customerService.GetPremiumQuoteAsync(policyId, userId);
            return Ok(quote);
        }

        [HttpGet("available-policies")]
        public async Task<ActionResult> GetAvailablePolicies()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var policies = await _customerService.GetAvailablePoliciesAsync(userId);
            return Ok(policies);
        }

    }
}