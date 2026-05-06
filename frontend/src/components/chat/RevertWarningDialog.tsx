import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useChat } from '../../context/ChatContext';

interface RevertWarningDialogProps {
  open: boolean;
  onClose: () => void;
  messageContent: string;
  messageIndex: number;
}

const RevertWarningDialog: React.FC<RevertWarningDialogProps> = ({
  open,
  onClose,
  messageContent,
  messageIndex,
}) => {
  const { revertToMessage, setInputContent } = useChat();

  const handleRevert = () => {
    revertToMessage(messageIndex);
    onClose();
  };

  const handleRevertAndEdit = () => {
    setInputContent(messageContent);
    revertToMessage(messageIndex);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Revert Conversation?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          This will remove all messages after the selected message.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your current input will be preserved.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleRevert} color="primary" variant="outlined">
          Revert
        </Button>
        <Button onClick={handleRevertAndEdit} color="primary" variant="contained">
          Revert &amp; Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RevertWarningDialog;
