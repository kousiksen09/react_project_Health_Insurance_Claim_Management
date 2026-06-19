import { useState } from 'react';
import { Box, Paper, Typography, Grid, TextField, Avatar, Button, CircularProgress } from '@mui/material';
import { Business, ArrowBack, Edit, Save, Cancel, PhotoCamera } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { profileApi, type ProfileData } from '../../../shared/services/profileApi';
import { USER_ROLE_LABELS, API_BASE_URL } from '../../../shared/utils/constants';

interface HospitalProfileProps {
  profile: ProfileData;
}

export const HospitalProfile = ({ profile }: HospitalProfileProps) => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    name: '',
    address: '',
    contactNumber: '',
    profileImage: undefined as File | undefined
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleEdit = () => {
    setFormData({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      name: profile.hospital?.name || '',
      address: profile.hospital?.address || '',
      contactNumber: profile.hospital?.contactNumber || '',
      profileImage: undefined
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ firstName: '', lastName: '', name: '', address: '', contactNumber: '', profileImage: undefined });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setSaving(true);
        const imageData = { 
          firstName: profile.firstName || '', 
          lastName: profile.lastName || '', 
          name: profile.hospital?.name || '',
          address: profile.hospital?.address || '',
          contactNumber: profile.hospital?.contactNumber || '',
          profileImage: file 
        };
        await profileApi.updateHospitalProfile(imageData);
        enqueueSnackbar('Profile image updated successfully!', { variant: 'success' });
        window.location.reload();
      } catch (error) {
        enqueueSnackbar('Failed to update profile image', { variant: 'error' });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await profileApi.updateHospitalProfile(formData);
      enqueueSnackbar('Profile updated successfully!', { variant: 'success' });
      setIsEditing(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      window.location.reload();
    } catch (error) {
      enqueueSnackbar('Failed to update profile', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button 
            startIcon={<ArrowBack />} 
            variant="outlined" 
            onClick={() => navigate(-1)}
            sx={{ minWidth: 'auto' }}
          >
            Back
          </Button>
          <Typography variant="h4">Hospital Profile</Typography>
        </Box>
        {!isEditing ? (
          <Button startIcon={<Edit />} variant="outlined" onClick={handleEdit}>
            Edit Profile
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              startIcon={<Save />} 
              variant="contained" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <CircularProgress size={20} /> : 'Save'}
            </Button>
            <Button 
              startIcon={<Cancel />} 
              variant="outlined" 
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </Box>
        )}
      </Box>
      
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar 
              sx={{ mr: 2, bgcolor: 'primary.main', width: 80, height: 80 }}
              src={previewUrl || (profile.profileImageUrl ? `${API_BASE_URL}${profile.profileImageUrl}` : undefined)}
            >
              {!previewUrl && !profile.profileImageUrl && <Business />}
            </Avatar>
            <Button
              component="label"
              sx={{
                position: 'absolute',
                bottom: -5,
                right: 10,
                minWidth: 'auto',
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
              disabled={saving}
            >
              <PhotoCamera sx={{ fontSize: 16, color: 'white' }} />
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageUpload}
              />
            </Button>
          </Box>
          <Box>
            <Typography variant="h5">
              {isEditing ? `${formData.firstName} ${formData.lastName}` : (profile.hospital?.name || `${profile.firstName || 'N/A'} ${profile.lastName || 'N/A'}`)}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {USER_ROLE_LABELS[profile.role as keyof typeof USER_ROLE_LABELS] || 'Unknown Role'}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              value={profile.email || ''}
              InputProps={{ readOnly: true }}
              variant="filled"
              sx={{ 
                '& .MuiFilledInput-root': { 
                  backgroundColor: 'grey.100',
                  '&:hover': { backgroundColor: 'grey.100' },
                  '&.Mui-focused': { backgroundColor: 'grey.100' }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="License Number"
              value={profile.hospital?.licenseNumber || ''}
              InputProps={{ readOnly: true }}
              variant="filled"
              sx={{ 
                '& .MuiFilledInput-root': { 
                  backgroundColor: 'grey.100',
                  '&:hover': { backgroundColor: 'grey.100' },
                  '&.Mui-focused': { backgroundColor: 'grey.100' }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              value={isEditing ? formData.firstName : (profile.firstName || '')}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              InputProps={{ readOnly: !isEditing }}
              variant="outlined"
              placeholder={!isEditing && !profile.firstName ? "Click Edit to add first name" : ""}
              required={isEditing}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={isEditing ? formData.lastName : (profile.lastName || '')}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              InputProps={{ readOnly: !isEditing }}
              variant="outlined"
              placeholder={!isEditing && !profile.lastName ? "Click Edit to add last name" : ""}
              required={isEditing}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Hospital Name"
              value={profile.hospital?.name || ''}
              InputProps={{ readOnly: true }}
              variant="filled"
              sx={{ 
                '& .MuiFilledInput-root': { 
                  backgroundColor: 'grey.100',
                  '&:hover': { backgroundColor: 'grey.100' },
                  '&.Mui-focused': { backgroundColor: 'grey.100' }
                }
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Contact Number"
              value={isEditing ? formData.contactNumber : (profile.hospital?.contactNumber || '')}
              onChange={(e) => handleInputChange('contactNumber', e.target.value)}
              InputProps={{ readOnly: !isEditing }}
              variant="outlined"
              required={isEditing}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Address"
              value={isEditing ? formData.address : (profile.hospital?.address || '')}
              onChange={(e) => handleInputChange('address', e.target.value)}
              InputProps={{ readOnly: !isEditing }}
              variant="outlined"
              multiline
              rows={3}
              required={isEditing}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};