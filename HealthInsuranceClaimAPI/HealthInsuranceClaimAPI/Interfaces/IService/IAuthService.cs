using HealthInsuranceClaimAPI.DTOs;
using HealthInsuranceClaimAPI.Models;

namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface IAuthService
    {
        Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
        Task<AuthResponseDto> RegisterCustomerAsync(RegisterCustomerDto registerDto);
        Task<AuthResponseDto> RegisterHospitalAsync(RegisterHospitalDto registerDto);
        Task<ProfileResponseDto> GetProfileAsync(int userId);
        Task<string> UpdateCustomerProfileAsync(int userId, UpdateCustomerProfileDto updateDto);
        Task<string> UpdateHospitalProfileAsync(int userId, UpdateHospitalProfileDto updateDto);
        Task<string> UpdateClaimOfficerProfileAsync(int userId, UpdateClaimOfficerProfileDto updateDto);
        Task<string> UpdateAdminProfileAsync(int userId, UpdateClaimOfficerProfileDto updateDto);
    }
}
