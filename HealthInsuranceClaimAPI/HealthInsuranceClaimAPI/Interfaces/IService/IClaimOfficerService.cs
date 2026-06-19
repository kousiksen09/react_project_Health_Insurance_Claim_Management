using HealthInsuranceClaimAPI.DTOs;

namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface IClaimOfficerService
    {
        Task<IEnumerable<ClaimDto>> GetPendingClaimsAsync(int userId);
        Task<IEnumerable<ClaimDto>> GetAllClaimsAsync(int userId);
        Task<ClaimDto> GetClaimDetailsAsync(int claimId);
        Task<string> ApproveClaimAsync(int claimId, decimal? approvedAmount, int userId);
        Task<string> RejectClaimAsync(int claimId, string rejectionReason, int userId);
        Task<string> RequestDocumentsAsync(int claimId, string documentRequest, int userId);
        Task<decimal> CalculateApprovedAmountAsync(int claimId, decimal requestedAmount);
        Task<string> ProcessPaymentAsync(int claimId, int userId);
        Task<IEnumerable<ClaimDocumentDto>> GetClaimDocumentsAsync(int claimId);
        Task<DocumentDownloadDto> DownloadDocumentAsync(int documentId);
        Task<ProfileResponseDto> GetProfileAsync(int userId);
        Task<string> UpdateProfileAsync(int userId, UpdateClaimOfficerProfileDto updateDto);
    }
}
