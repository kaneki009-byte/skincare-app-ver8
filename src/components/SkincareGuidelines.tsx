const SkincareGuidelines = () => (
  <div className="guidelines-wrapper">
    <div className="card guidelines-card">
      <section className="guideline-section">
        <h2>⭕️アドプロテープ</h2>
        <p>◯浮腫あればアドプロテープの使用</p>

        <figure className="guideline-figure">
          <img src="/pressure_points.jpg" alt="圧迫リスク部位の図" />
        </figure>

        <div>
          <p>◯医療機器との接触部位にアドプロテープ使用</p>
          <ul>
            <li>NPPV→鼻骨</li>
            <li>OFM→鼻骨、耳</li>
            <li>ナザール→耳</li>
            <li>弾性ストッキング→脛（スネ）</li>
            <li>膀胱留置カテーテル→カテーテル接続部分</li>
            <li>シーネ→マジックテープ部分</li>
          </ul>
        </div>
      </section>

      <section className="guideline-section">
        <h2>⭕️ワセリン</h2>
        <p>◯失禁がある方→ワセリンの使用</p>
        <p className="guideline-note">（朝のケアの際の、おむつ交換時にワセリン塗布）</p>
      </section>
    </div>
  </div>
);

export default SkincareGuidelines;
