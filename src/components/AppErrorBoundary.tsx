import React from 'react';
export class AppErrorBoundary extends React.Component<React.PropsWithChildren, {failed:boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() {return {failed:true};}
  render() {
    if(this.state.failed) return <main style={{padding:32,fontFamily:'sans-serif'}}><h1>Não foi possível mostrar esta página.</h1><p>Os dados guardados neste navegador foram conservados. Reabre a aplicação para tentar novamente.</p><button onClick={() => window.location.reload()}>Reabrir VagasMZ</button></main>;
    return this.props.children;
  }
}
