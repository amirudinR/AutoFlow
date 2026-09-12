export default function SettingBlock({ icon: Icon, title, description, children }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-800 font-bold text-[12px]">
        <Icon className="w-4 h-4" />
        {title}
      </div>
      {children}
      <p className="text-[11px] text-slate-500 leading-tight">{description}</p>
    </div>
  );
}
