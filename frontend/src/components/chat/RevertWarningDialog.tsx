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

  const handleReplaceAndRevert = () => {
    setInputContent(messageContent);
    revertToMessage(messageIndex);
    onClose();
  };

  const handleRevertOnly = () => {
    revertToMessage(messageIndex);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Revert Conversation?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          The chat box already contains text. How would you like to proceed?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleRevertOnly} color="primary">
          Revert Only
        </Button>
        <Button onClick={handleReplaceAndRevert} color="primary" variant="contained">
          Replace & Revert
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RevertWarningDialog;
