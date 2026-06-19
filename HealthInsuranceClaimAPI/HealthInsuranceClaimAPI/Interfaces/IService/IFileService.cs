namespace HealthInsuranceClaimAPI.Interfaces.IService
{
    public interface IFileService
    {
        Task<string> SaveFileAsync(IFormFile file, string folder);
        Task<string> SaveProfileImageAsync(IFormFile file, int userId);
        Task<bool> DeleteFileAsync(string filePath);
        string GetFileUrl(string filePath);
    }
}