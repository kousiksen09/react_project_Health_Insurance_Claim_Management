using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Interfaces.IService;
using System.Security.Claims;

namespace HealthInsuranceClaimAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromForm] LoginDto loginDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return Ok(new AuthResponseDto
                {
                    Success = false,
                    Message = string.Join(", ", errors)
                });
            }
                
            var result = await _authService.LoginAsync(loginDto);
            return Ok(result);
        }

        [HttpPost("register/customer")]
        public async Task<ActionResult<AuthResponseDto>> RegisterCustomer([FromForm] RegisterCustomerDto registerDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return Ok(new AuthResponseDto
                {
                    Success = false,
                    Message = string.Join(", ", errors)
                });
            }
                
            try
            {
                var result = await _authService.RegisterCustomerAsync(registerDto);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return Ok(new AuthResponseDto
                {
                    Success = false,
                    Message = ex.Message
                });
            }
        }

        [HttpPost("register/hospital")]
        public async Task<ActionResult<AuthResponseDto>> RegisterHospital([FromForm] RegisterHospitalDto registerDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return Ok(new AuthResponseDto
                {
                    Success = false,
                    Message = string.Join(", ", errors)
                });
            }
                
            var result = await _authService.RegisterHospitalAsync(registerDto);
            return Ok(result);
        }

    }
}