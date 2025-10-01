interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressBar = ({ currentStep, totalSteps }: ProgressBarProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between mb-2 text-xs text-gray-400">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-primary-600 to-secondary-600 rounded-full"
        />
      </div>
    </div>
  );
};

export default ProgressBar;
