/**
 * Custom hook for analyzing audio streams in WebRTC connections.
 * Provides functionality to monitor audio levels for voice activity detection.
 * 
 * @param stream - The MediaStream object to analyze, typically from getUserMedia
 * @returns Object containing the checkAudioLevel function to get current audio levels
 */
import { useRef, useEffect } from 'react';

export const useAudioAnalysis = (stream: MediaStream | null) => {
  // Refs persist between renders and store audio context objects
  const audioContext = useRef<AudioContext | null>(null);
  const audioAnalyser = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream) return;

    /**
     * Sets up the Web Audio API components for analyzing audio levels.
     * Creates an AudioContext and connects it to an AnalyserNode for 
     * real-time frequency analysis.
     */
    const setupAudioAnalysis = () => {
      try {
        // Create new AudioContext if not exists
        if (!audioContext.current) {
          audioContext.current = new AudioContext();
        }

        // Configure analyzer for frequency data
        const analyser = audioContext.current.createAnalyser();
        analyser.fftSize = 2048; // Set FFT size for frequency analysis resolution
        
        // Connect stream to analyzer
        const source = audioContext.current.createMediaStreamSource(stream);
        source.connect(analyser);
        audioAnalyser.current = analyser;

        console.log('Audio analysis setup complete');
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
      }
    };

    setupAudioAnalysis();

    // Cleanup function to disconnect and close audio components
    return () => {
      if (audioAnalyser.current) {
        audioAnalyser.current.disconnect();
      }
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [stream]);

  /**
   * Analyzes current audio levels from the stream.
   * Uses frequency data to calculate average volume level.
   * 
   * @returns number - Average audio level (0-255)
   */
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