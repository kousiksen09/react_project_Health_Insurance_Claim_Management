using HealthInsuranceClaimAPI.Interfaces.IService;

namespace HealthInsuranceClaimAPI.Services
{
    public class FileService : IFileService
    {
        private readonly string _uploadPath;
        private readonly IWebHostEnvironment _environment;

        public FileService(IConfiguration configuration, IWebHostEnvironment environment)
        {
            _uploadPath = configuration["FileUpload:Path"] ?? "uploads";
            _environment = environment;
            Directory.CreateDirectory(_uploadPath);
        }

        public async Task<string> SaveFileAsync(IFormFile file, string folder)
        {
            var contentType = GetContentType(folder);
            var sanitizedFolder = NormalizeFolder(folder, contentType);
            var folderPath = Path.Combine(_uploadPath, contentType, sanitizedFolder);
            Directory.CreateDirectory(folderPath);
            
            var sanitizedFileName = Path.GetFileName(file.FileName);
            var fileName = $"{Guid.NewGuid()}_{sanitizedFileName}";
            var filePath = Path.Combine(folderPath, fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return filePath;
        }

        public async Task<string> SaveProfileImageAsync(IFormFile file, int userId)
        {
            var folderPath = Path.Combine(_uploadPath, "profiles");
            Directory.CreateDirectory(folderPath);
            
            var fileName = $"profile_{userId}_{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(folderPath, fileName);

            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            return $"/uploads/profiles/{fileName}";
        }

        public Task<bool> DeleteFileAsync(string filePath)
        {
            try
            {
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    return Task.FromResult(true);
                }
                return Task.FromResult(false);
            }
            catch
            {
                return Task.FromResult(false);
            }
        }

        public string GetFileUrl(string filePath)
        {
            return filePath.Replace(_uploadPath, "/uploads").Replace("\\", "/");
        }

        private static string GetContentType(string folder)
        {
            var normalized = folder.Trim().ToLowerInvariant();
            return normalized switch
            {
                "profile" or "profiles" => "profiles",
                _ => "claims"
            };
        }

        private static string NormalizeFolder(string folder, string contentType)
        {
            if (contentType == "profiles") return string.Empty;
            
            var normalized = folder.Trim().ToLowerInvariant();
            return normalized switch
            {
                "reports" => "reports",
                "bills" => "bills",
                "prescriptions" => "prescriptions",
                "discharge summaries" or "discharge summary" => "discharge_summaries",
                "lab reports" or "lab report" => "lab_reports",
                "additional documents" or "additional document" => "additional_documents",
                _ => normalized
            };
        }
    }
}