import React from 'react';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{padding:'1.5rem',color:'#a00',background:'#fff8f8',border:'1px solid #fcc',borderRadius:'8px',fontFamily:'monospace',fontSize:'13px'}}>
          <strong>Component render error — check console for full stack</strong>
          <pre style={{whiteSpace:'pre-wrap',marginTop:'8px',fontSize:'12px'}}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
