import { useRef, useEffect } from 'react';

export const useAudioAnalysis = (stream: MediaStream | null) => {
  const audioContext = useRef<AudioContext | null>(null);
  const audioAnalyser = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream) return;

    const setupAudioAnalysis = () => {
      try {
        if (!audioContext.current) {
          audioContext.current = new AudioContext();
        }

        const analyser = audioContext.current.createAnalyser();
        analyser.fftSize = 2048;
        const source = audioContext.current.createMediaStreamSource(stream);
        source.connect(analyser);
        audioAnalyser.current = analyser;

        console.log('Audio analysis setup complete');
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
      }
    };

    setupAudioAnalysis();

    return () => {
      if (audioAnalyser.current) {
        audioAnalyser.current.disconnect();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [stream]);

  const checkAudioLevel = () => {
    if (!audioAnalyser.current) return 0;

    const bufferLength = audioAnalyser.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    audioAnalyser.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
    return average;
  };

  return { checkAudioLevel };
};