import { tr, ph, aqiCat } from '../i18n/dynamic';
import React, { useMemo } from 'react';
import { User, Truck, Factory, Building2, Info } from 'lucide-react';
import { useEnvironmentData } from '../context/EnvironmentDataContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, CardHeader } from '../components/common/Card';
import { EmptyState, CardSkeleton } from '../components/common/States';
import { classifyUsAqi } from '../utils/aqi';

interface Recommendation {
  title: string;
  detail: string;
}

function buildRecommendations(aqi: number | null, pm25: number | null, tempC: number | null) {
  const category = classifyUsAqi(aqi);
  const elevated = aqi !== null && aqi > 100;
  const severe = aqi !== null && aqi > 200;
  const hot = tempC !== null && tempC >= 38;

  const citizens: Recommendation[] = [];
  const traffic: Recommendation[] = [];
  const industrial: Recommendation[] = [];
  const city: Recommendation[] = [];

  if (severe) {
    citizens.push({ title: tr('Avoid outdoor exertion', 'बाहर की मेहनत से बचें'), detail: tr(`AQI is ${category.toLowerCase()}. Stay indoors where possible and use air filtration.`, `AQI ${aqiCat(category)} है। हो सके तो घर के अंदर रहें और एयर फ़िल्टर का उपयोग करें।`) });
    citizens.push({ title: tr('Wear a mask outdoors', 'बाहर मास्क पहनें'), detail: tr('N95-grade masks reduce fine particulate exposure during severe events.', 'गंभीर स्थिति में N95 मास्क बारीक कणों के संपर्क को घटाते हैं।') });
    traffic.push({ title: tr('Consider odd-even or restriction schemes', 'सम-विषम या प्रतिबंध योजनाओं पर विचार करें'), detail: tr('Temporary vehicle restrictions can meaningfully cut peak-hour emissions during severe episodes.', 'गंभीर दौर में अस्थायी वाहन प्रतिबंध भीड़-घंटों का उत्सर्जन काफ़ी घटा सकते हैं।') });
    industrial.push({ title: tr('Review emission permits for compliance', 'अनुपालन के लिए उत्सर्जन अनुमतियों की समीक्षा करें'), detail: tr('Cross-check active industrial output against permitted emission ceilings during the episode.', 'इस दौर में चालू औद्योगिक उत्पादन को अनुमत उत्सर्जन सीमा से मिलाकर जाँचें।') });
    city.push({ title: tr('Issue a public health advisory', 'जन-स्वास्थ्य परामर्श जारी करें'), detail: tr('Notify schools and outdoor event organizers of the elevated risk.', 'स्कूलों और बाहरी आयोजकों को बढ़े हुए जोखिम की सूचना दें।') });
  } else if (elevated) {
    citizens.push({ title: tr('Limit prolonged outdoor exertion', 'लंबी बाहरी मेहनत सीमित करें'), detail: tr('Sensitive groups (children, elderly, respiratory/heart conditions) should reduce time outdoors.', 'संवेदनशील समूह (बच्चे, बुज़ुर्ग, साँस/हृदय के रोगी) बाहर कम समय बिताएँ।') });
    citizens.push({ title: tr('Keep windows closed during peak hours', 'चरम घंटों में खिड़कियाँ बंद रखें'), detail: tr('Indoor air quality benefits from limiting outdoor air exchange during high-pollution windows.', 'ज़्यादा प्रदूषण वाले समय बाहरी हवा का आदान-प्रदान सीमित करने से घर की हवा बेहतर रहती है।') });
    traffic.push({ title: tr('Encourage carpooling / public transit', 'कारपूलिंग / सार्वजनिक परिवहन को बढ़ावा दें'), detail: tr('Reducing single-occupancy trips helps ease localized congestion-driven emissions.', 'अकेले सफ़र घटाने से भीड़ से होने वाला स्थानीय उत्सर्जन कम होता है।') });
    industrial.push({ title: tr('Increase monitoring frequency', 'निगरानी की आवृत्ति बढ़ाएँ'), detail: tr('Shorten reporting intervals for emission-heavy processes while AQI remains elevated.', 'AQI ऊँचा रहने तक ज़्यादा उत्सर्जन वाली प्रक्रियाओं की रिपोर्टिंग का अंतराल घटाएँ।') });
    city.push({ title: tr('Monitor sensitive locations', 'संवेदनशील स्थानों पर नज़र रखें'), detail: tr('Track AQI near schools, hospitals, and eldercare facilities more closely.', 'स्कूलों, अस्पतालों और वृद्धाश्रमों के पास AQI पर ज़्यादा बारीकी से नज़र रखें।') });
  } else {
    citizens.push({ title: tr('Enjoy normal outdoor activity', 'सामान्य बाहरी गतिविधि का आनंद लें'), detail: tr('Air quality is within a good/moderate range for typical outdoor plans.', 'सामान्य बाहरी योजनाओं के लिए वायु गुणवत्ता अच्छी/मध्यम सीमा में है।') });
    traffic.push({ title: tr('No special traffic measures needed', 'किसी ख़ास ट्रैफ़िक उपाय की ज़रूरत नहीं'), detail: tr('Current conditions do not warrant congestion mitigation action.', 'मौजूदा हालात में भीड़ घटाने की कार्रवाई ज़रूरी नहीं।') });
    industrial.push({ title: tr('Maintain standard monitoring cadence', 'सामान्य निगरानी क्रम बनाए रखें'), detail: tr('Continue routine emission compliance checks.', 'नियमित उत्सर्जन अनुपालन जाँच जारी रखें।') });
    city.push({ title: tr('No advisory needed', 'किसी परामर्श की ज़रूरत नहीं'), detail: tr('Conditions are within typical ranges for public activity.', 'हालात सार्वजनिक गतिविधि के लिए सामान्य सीमा में हैं।') });
  }

  if (pm25 !== null && pm25 > 90) {
    citizens.push({ title: tr('Reduce indoor combustion sources', 'घर के अंदर जलने के स्रोत घटाएँ'), detail: tr('Avoid candles, incense, or indoor cooking smoke while PM2.5 is spiking.', 'PM2.5 बढ़ा होने पर मोमबत्ती, अगरबत्ती या घर में खाना पकाने का धुआँ टालें।') });
  }
  if (hot) {
    citizens.push({ title: tr('Stay hydrated and avoid peak sun', 'पानी पीते रहें और तेज़ धूप से बचें'), detail: tr('Extreme heat combined with pollution increases health risk — limit midday outdoor exposure.', 'भीषण गर्मी और प्रदूषण मिलकर स्वास्थ्य जोखिम बढ़ाते हैं — दोपहर में बाहर कम रहें।') });
  }

  return { citizens, traffic, industrial, city };
}

const CATEGORIES = [
  { key: 'citizens' as const, label: 'Citizens', icon: User, color: '--color-accent' },
  { key: 'traffic' as const, label: 'Traffic Authorities', icon: Truck, color: '--color-accent-blue' },
  { key: 'industrial' as const, label: 'Industrial Authorities', icon: Factory, color: '--color-warning' },
  { key: 'city' as const, label: 'City Administration', icon: Building2, color: '--color-advanced' },
];

const ActionsPage: React.FC = () => {
  const { airQuality, weather, status } = useEnvironmentData();
  const { t } = useLanguage();

  const recs = useMemo(
    () => buildRecommendations(airQuality?.current.aqi ?? null, airQuality?.current.pm2_5 ?? null, weather?.current.temperature ?? null),
    [airQuality, weather]
  );

  if (status === 'LOADING' && !airQuality) {
    return (
      <div className="grid sm:grid-cols-2 gap-5">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    );
  }

  if (!airQuality) {
    return (
      <Card>
        <EmptyState title={t('pages.actions.noRecommendations')} message="Recommendations will appear once environmental data loads for this location." />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{tr('Environmental Actions', 'पर्यावरणीय कार्रवाइयाँ')}</h1>

      <Card className="border-[var(--color-accent-blue)]/30 bg-[var(--color-accent-blue)]/[0.04]">
        <div className="flex gap-2.5 items-start">
          <Info size={15} className="text-[var(--color-accent-blue)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            {tr('These recommendations are decision-support suggestions generated from current conditions and general public-health guidance. They are informational only and are not connected to any official municipal authority system.', 'ये सिफ़ारिशें मौजूदा हालात और सामान्य जन-स्वास्थ्य सलाह से बने निर्णय-सहायक सुझाव हैं। ये सिर्फ़ जानकारी के लिए हैं और किसी आधिकारिक नगरपालिका प्रणाली से जुड़े नहीं हैं।')}
          </p>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-5">
        {CATEGORIES.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader title={ph(label)} icon={Icon} />
            <ul className="space-y-3">
              {recs[key].map((r) => (
                <li key={r.title} className="rounded-lg border border-[var(--color-panel-border)] p-3">
                  <p className="text-xs font-semibold" style={{ color: `var(${color})` }}>{r.title}</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-relaxed">{r.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ActionsPage;
