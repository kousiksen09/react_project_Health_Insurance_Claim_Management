using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HealthInsuranceClaimAPI.Models;
using HealthInsuranceClaimAPI.Interfaces.IService;

namespace HealthInsuranceClaimAPI.Services
{
    public class JwtService : IJwtService
    {
        private readonly IConfiguration _configuration;

        public JwtService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new System.Security.Claims.Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new System.Security.Claims.Claim(ClaimTypes.Email, user.Email),
                new System.Security.Claims.Claim(ClaimTypes.Role, user.Role switch
                {
                    HealthInsuranceClaimAPI.Enums.UserRole.Admin => "Admin",
                    HealthInsuranceClaimAPI.Enums.UserRole.Customer => "Customer",
                    HealthInsuranceClaimAPI.Enums.UserRole.Hospital => "Hospital",
                    HealthInsuranceClaimAPI.Enums.UserRole.ClaimOfficer => "ClaimOfficer",
                    _ => "Unknown"
                })
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(24),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}