import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import { useChat } from "../../context/ChatContext";

interface ForkConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  messageIndex: number;
  conversationTitle: string;
}

const ForkConfirmDialog: React.FC<ForkConfirmDialogProps> = ({
  open,
  onClose,
  messageIndex,
  conversationTitle,
}) => {
  const { forkConversation } = useChat();

  const handleFork = () => {
    forkConversation(messageIndex);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Fork Conversation</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Fork from this message?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This creates a new conversation branched from this point, containing
          all messages up to and including this assistant response. You can
          continue the conversation from here independently.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          New conversation will be named: <strong>Fork of {conversationTitle}</strong>
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleFork} variant="contained" color="primary">
          Fork
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForkConfirmDialog;
