import { DataGrid } from '@mui/x-data-grid';

export const StyledDataGrid = (props: any) => {
  return (
    <DataGrid
      {...props}
      disableColumnSorting
      sx={{ 
        flex: 1,
        width: '100%',
        minHeight: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        '& .MuiDataGrid-main': {
          overflow: 'hidden'
        },
        '& .MuiDataGrid-virtualScroller': {
          overflowX: 'auto',
          overflowY: 'auto'
        },
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: '#f5f5f5',
          color: 'black',
          fontWeight: 'normal',
          minHeight: '56px !important'
        },
        '& .MuiDataGrid-columnHeaderTitle': {
          color: 'black',
          fontWeight: 'normal'
        },
        '& .MuiDataGrid-columnSeparator': {
          display: 'none'
        },
        '& .MuiDataGrid-iconButtonContainer': {
          display: 'none'
        },
        '& .MuiDataGrid-row:hover': {
          backgroundColor: 'rgba(44, 90, 160, 0.05)'
        },
        ...props.sx
      }}
    />
  );
};