// Hook gửi kết quả test lên API BFF
import { useMutation } from '@tanstack/react-query';
import { postAssessment } from '../services/assessment.api';
export const useSubmitAssessment = () => useMutation({ mutationFn: postAssessment });
