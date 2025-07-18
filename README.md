# CPU Profile Comparator

A web application for comparing CPU profiling data side-by-side with visual difference highlighting.

## Features

- **Side-by-side comparison**: Upload two CPU profiles and compare them visually
- **Flame graph visualization**: Interactive flame graphs for each profile
- **Difference highlighting**: See exactly what changed between profiles
- **Performance metrics**: Total duration, function count, and performance impact
- **Detailed function analysis**: Sortable table showing function-level differences

## Supported Formats

- Chrome DevTools CPU profiles (.cpuprofile)
- V8 profiler output
- JSON format with nodes, samples, and timeDeltas

## Usage

1. **Start the development server**:
   ```bash
   npm install
   npm run dev
   ```

2. **Upload profiles**:
   - Use the "Upload Left Profile" button to upload your baseline profile
   - Use the "Upload Right Profile" button to upload your comparison profile

3. **View results**:
   - The comparison panel will automatically appear when both profiles are loaded
   - Green highlights indicate performance improvements (faster)
   - Red highlights indicate performance regressions (slower)
   - Blue badges show newly added functions
   - Red badges show removed functions

## Example

The repository includes an example profile (`Profile_trace_for_9.1.72-0.cpuprofile`) that you can use to test the application.

## Building for Production

```bash
npm run build
```

This will create a `dist` folder with the production build.

## Technical Details

- Built with React + TypeScript
- Uses D3.js and d3-flame-graph for visualization
- Styled with Tailwind CSS
- Parses Chrome DevTools CPU profile format
- Calculates timing differences and performance metrics 
